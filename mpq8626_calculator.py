#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MPQ8626GD / IS6605A Synchronous Buck Converter Design Calculator
================================================================
Standalone Engineering Script - Zero External Dependencies
Calculates all power stage and passive components for MPS MPQ8626GD & Innovision IS6605A (16V, 6A, QFN-14).
Supports all pins: PGND (1,14), SW/PHASE (2,11), VIN (3), CS (4), EN (5), FB (6), AGND (7),
TRK/REF (8), PGOOD (9), BST (10), MODE (12), VCC (13).
Includes E24 / E96 series snapping and JSON export.
"""

import sys
import math
import json
from typing import Dict, Any, Tuple

E24_BASE = [
    1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
    3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1
]

E96_BASE = [
    1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30,
    1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74,
    1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21, 2.26, 2.32,
    2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09,
    3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12,
    4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49,
    5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32,
    7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76
]

def find_nearest_standard(target: float, series: str = 'E24') -> Tuple[float, float]:
    """Finds the nearest standard nominal value in E24 or E96 and returns (nominal, error_pct)."""
    if target <= 0:
        return 0.0, 0.0
    base = E96_BASE if series == 'E96' else E24_BASE
    exp = math.floor(math.log10(target))
    norm = target / (10 ** exp)
    
    best_base = min(base, key=lambda x: abs(x - norm))
    wrap_next = base[0] * 10
    if abs(wrap_next - norm) < abs(best_base - norm):
        best_base = wrap_next
        
    nominal = round(best_base * (10 ** exp), 4)
    error_pct = ((nominal - target) / target) * 100.0
    return nominal, round(error_pct, 2)

def calculate_mpq8626(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Computes all passive and power stage components for MPQ8626GD / IS6605A."""
    chip = str(inputs.get('chipModel', 'MPQ8626GD'))
    is_mpq = 'MPQ' in chip

    vin_nom = float(inputs.get('vinNom', 12.0))
    vin_min = float(inputs.get('vinMin', 10.8))
    vin_max = float(inputs.get('vinMax', 13.2))
    vout = float(inputs.get('vout', 1.8))
    iout = float(inputs.get('ioutMax', 6.0))
    fsw_khz = float(inputs.get('fswKhz', 1100.0))
    kind = float(inputs.get('kind', 0.35))
    vout_ripple_mv = float(inputs.get('voutRippleMaxMv', 15.0))
    load_step = float(inputs.get('loadStepA', 3.0))
    overshoot_mv = float(inputs.get('voltageOvershootMv', 50.0))
    target_fz_khz = float(inputs.get('targetFzKhz', 15.0))
    ilim_target = float(inputs.get('ilimTargetA', 6.0))

    fsw = fsw_khz * 1000.0
    vref = 0.600
    ton_min_ns = 50.0 if is_mpq else 40.0
    internal_tss_ms = 2.2 if is_mpq else 1.4
    iss_charge_ua = 10.0 if is_mpq else 12.0

    # 1. Duty Cycle & Timing
    eff_est = 0.92
    duty_nom = min(0.90, vout / (vin_nom * eff_est))
    duty_min = min(0.90, vout / (vin_max * eff_est))
    duty_max = min(0.90, vout / (vin_min * eff_est))

    tsw_ns = (1.0 / fsw) * 1e9
    ton_ns = (vout / (vin_max * fsw)) * 1e9
    toff_ns = tsw_ns - ton_ns

    # 2. Inductor Selection (Datasheet Eq. 16)
    ton_sec = vout / (vin_max * fsw)
    delta_il_target = iout * kind
    l_calc_h = ((vin_max - vout) * ton_sec) / delta_il_target
    l_calc_uh = l_calc_h * 1e6
    l_nom_uh, _ = find_nearest_standard(l_calc_uh, 'E24')
    l_nom_h = l_nom_uh * 1e-6

    actual_delta_il = ((vin_max - vout) * ton_sec) / l_nom_h
    actual_kind = actual_delta_il / iout
    ipeak = iout + actual_delta_il / 2.0
    ivalley = max(0.0, iout - actual_delta_il / 2.0)
    irms = math.sqrt(iout**2 + (actual_delta_il**2) / 12.0)

    # 3. Output Capacitor
    cout_ripple_uf = (actual_delta_il / (8.0 * fsw * (vout_ripple_mv / 1000.0))) * 1e6
    cout_transient_uf = ((l_nom_h * (load_step**2)) / (2.0 * vout * (overshoot_mv / 1000.0))) * 1e6
    cout_stability_uf = ((ton_sec / 2.0) * ((8.0 * 1.0e-6) / l_nom_h) * (vref / vout)) * 1e6
    cout_eff_min_uf = max(cout_ripple_uf, cout_transient_uf, cout_stability_uf)
    cout_target_nom_uf = cout_eff_min_uf / 0.55  # 45% DC bias derating
    single_cout_uf = 22 if cout_target_nom_uf <= 40 else (47 if cout_target_nom_uf <= 100 else 22)
    cout_qty = max(2, math.ceil(cout_target_nom_uf / single_cout_uf))
    total_cout_uf = cout_qty * single_cout_uf

    # 4. Input Capacitor
    cin_rms = iout * math.sqrt(duty_nom * (1.0 - duty_nom))
    cin_min_uf = ((iout * duty_nom * (1.0 - duty_nom)) / (fsw * max(0.1, vin_nom * 0.015))) * 1e6
    cin_qty = max(2, math.ceil((cin_min_uf / 0.5) / 22.0))
    total_cin_uf = cin_qty * 22

    # 5. Feedback Divider & Cff (Pin 6 FB)
    r1_nom = float(inputs.get('r1Kohm', 4.02))
    r2_theor = (r1_nom * vref) / (vout - vref)
    r2_nom, _ = find_nearest_standard(r2_theor, 'E96')
    actual_vout = round(vref * (1.0 + r1_nom / r2_nom), 3)

    cff_calc_pf = (1.0 / (2.0 * math.pi * (r1_nom * 1000.0) * (target_fz_khz * 1000.0))) * 1e12
    cff_nom_pf, _ = find_nearest_standard(cff_calc_pf, 'E24')
    actual_fz_khz = round(1.0 / (2.0 * math.pi * (r1_nom * 1000.0) * (cff_nom_pf * 1e-12)) / 1000.0, 1)

    # 6. Current Limit CS Resistor (Pin 4 CS)
    target_ivalley = max(1.0, ilim_target - actual_delta_il / 2.0)
    rcs_theor_k = 1.20 / ((40.0 * 1e-6) * target_ivalley * 1000.0)
    rcs_nom_k, _ = find_nearest_standard(rcs_theor_k, 'E96')
    actual_ivalley = round(1.20 / ((40.0 * 1e-6) * (rcs_nom_k * 1000.0)), 2)
    actual_ilim_dc = round(actual_ivalley + actual_delta_il / 2.0, 2)

    # 7. Soft Start (Pin 8 TRK/REF)
    tss_req_ms = float(inputs.get('tssMs', 2.2))
    if tss_req_ms <= internal_tss_ms:
        cref_theor_nf = 3.3 if is_mpq else 22.0
        actual_tss_ms = internal_tss_ms
    else:
        cref_theor_nf = (tss_req_ms * (iss_charge_ua * 1e-3)) / vref
        actual_tss_ms = tss_req_ms
    cref_nom_nf, _ = find_nearest_standard(cref_theor_nf, 'E24')

    # 8. MODE Resistor (Pin 12)
    mode_table = {
        ('FCCM', 1100): ('AGND (0 Ω)', 0.0),
        ('FCCM', 2000): ('30.1 kΩ к AGND', 30.1),
        ('FCCM', 600): ('60.4 kΩ к AGND', 60.4),
        ('PulseSkip', 600): ('121 kΩ к AGND', 121.0),
        ('PulseSkip', 2000): ('243 kΩ к AGND', 243.0),
        ('PulseSkip', 1100): ('VCC (0 Ω к 3.3V)', 0.0),
    }
    mode_key = (inputs.get('lightLoadMode', 'FCCM'), int(fsw_khz))
    mode_desc, rmode_nom = mode_table.get(mode_key, ('AGND (0 Ω)', 0.0))

    # 9. EN / UVLO (Pin 5 EN)
    rdown_nom = 10.0
    vin_start = float(inputs.get('vinStartUvlo', 10.0))
    rup_theor = rdown_nom * (vin_start / 1.22 - 1.0)
    rup_nom, _ = find_nearest_standard(rup_theor, 'E96')
    actual_vin_start = round(1.22 * (1.0 + rup_nom / rdown_nom), 2)
    actual_vin_stop = round(1.02 * (1.0 + rup_nom / rdown_nom), 2)
    ven_at_max = round(vin_max * rdown_nom / (rup_nom + rdown_nom), 2)

    # 10. Losses & Efficiency
    r_hs = (22.6 if is_mpq else 22.5) * 1e-3
    r_ls = (8.1 if is_mpq else 8.5) * 1e-3
    p_cond = irms**2 * (duty_nom * r_hs + (1.0 - duty_nom) * r_ls)
    p_sw = 0.5 * vin_nom * iout * 12e-9 * fsw
    p_dcr = irms**2 * 0.007
    p_q = vin_nom * 0.0015 + 3.0 * 20e-9 * fsw
    p_loss = p_cond + p_sw + p_dcr + p_q
    p_out = vout * iout
    efficiency = round((p_out / (p_out + p_loss)) * 100.0, 1)

    return {
        'chip': chip,
        'package': 'QFN-14 (2mm x 3mm)',
        'duty_nominal': round(duty_nom, 3),
        'ton_ns': round(ton_ns, 1),
        'toff_ns': round(toff_ns, 1),
        'fsw_khz': fsw_khz,
        'inductor_uh': l_nom_uh,
        'delta_il_a': round(actual_delta_il, 2),
        'ipeak_a': round(ipeak, 2),
        'ivalley_a': round(ivalley, 2),
        'irms_a': round(irms, 2),
        'cout_qty_x_uf': f"{cout_qty} x {single_cout_uf} uF ({total_cout_uf} uF)",
        'cin_qty_x_uf': f"{cin_qty} x 22 uF ({total_cin_uf} uF) + 0.1 uF",
        'r1_top_kohm': r1_nom,
        'r2_bot_kohm': r2_nom,
        'actual_vout': actual_vout,
        'cff_pf': cff_nom_pf,
        'actual_fz_khz': actual_fz_khz,
        'rcs_kohm': rcs_nom_k,
        'actual_ilim_dc_a': actual_ilim_dc,
        'cref_nf': cref_nom_nf,
        'actual_tss_ms': actual_tss_ms,
        'mode_pin_connection': mode_desc,
        'rup_kohm': rup_nom,
        'rdown_kohm': rdown_nom,
        'actual_vin_start': actual_vin_start,
        'actual_vin_stop': actual_vin_stop,
        'ven_at_vin_max': ven_at_max,
        'cboot_nf': 100,
        'rboot_ohm': 3.3,
        'cvcc_uf': 1.0,
        'rpgood_kohm': 10.0,
        'efficiency_pct': efficiency,
        'total_power_loss_w': round(p_loss, 2),
    }

def print_design_report(res: Dict[str, Any]) -> None:
    print("=" * 72)
    print(f"  {res['chip']} SYNCHRONOUS BUCK REGULATOR DESIGN REPORT")
    print(f"  Package: {res['package']} | Reference Vref = 0.600 V")
    print("=" * 72)
    print(f"  Switching Frequency:  {res['fsw_khz']} kHz (Ton = {res['ton_ns']} ns, D = {res['duty_nominal']})")
    print(f"  MODE Configuration:   {res['mode_pin_connection']}")
    print("-" * 72)
    print(f"  Power Inductor L1:    {res['inductor_uh']} µH (Delta IL = {res['delta_il_a']} A, Ipeak = {res['ipeak_a']} A)")
    print(f"  Output Capacitors:    {res['cout_qty_x_uf']} MLCC X7R")
    print(f"  Input Capacitors:     {res['cin_qty_x_uf']} MLCC 25V X7R")
    print("-" * 72)
    print(f"  Feedback Divider:     R1 = {res['r1_top_kohm']} kΩ, R2 = {res['r2_bot_kohm']} kΩ -> Vout = {res['actual_vout']} V")
    print(f"  Feed-forward Cap Cff: {res['cff_pf']} pF (Zero fz = {res['actual_fz_khz']} kHz)")
    print(f"  Current Limit (CS):   Rcs = {res['rcs_kohm']} kΩ -> Ilim ≈ {res['actual_ilim_dc_a']} A")
    print(f"  Soft-Start (TRK/REF): Cref = {res['cref_nf']} nF -> Tss = {res['actual_tss_ms']} ms")
    print(f"  UVLO Divider (EN):    Rup = {res['rup_kohm']} kΩ, Rdown = {res['rdown_kohm']} kΩ (Start = {res['actual_vin_start']}V)")
    print(f"  Bootstrap Loop:       Cboot = {res['cboot_nf']} nF + Rboot = {res['rboot_ohm']} Ω damping")
    print(f"  VCC Decoupling:       Cvcc = {res['cvcc_uf']} µF X7R to AGND/PGND")
    print(f"  Power Good:           Rpgood = {res['rpgood_kohm']} kΩ pull-up to VCC")
    print("-" * 72)
    print(f"  Estimated Efficiency: {res['efficiency_pct']}% (Power Loss: ~{res['total_power_loss_w']} W)")
    print("=" * 72)

if __name__ == '__main__':
    default_inputs = {
        'chipModel': 'MPQ8626GD',
        'vinNom': 12.0,
        'vinMin': 10.8,
        'vinMax': 13.2,
        'vout': 1.8,
        'ioutMax': 6.0,
        'fswKhz': 1100,
        'lightLoadMode': 'FCCM',
        'kind': 0.35,
        'voutRippleMaxMv': 15,
        'loadStepA': 3.0,
        'voltageOvershootMv': 50,
        'tssMs': 2.2,
        'vinStartUvlo': 10.0,
        'ilimTargetA': 6.0,
        'targetFzKhz': 15.0,
        'r1Kohm': 4.02,
    }
    if len(sys.argv) > 1 and sys.argv[1].endswith('.json'):
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
            inputs = data.get('inputs', data)
    else:
        inputs = default_inputs
    res = calculate_mpq8626(inputs)
    print_design_report(res)
