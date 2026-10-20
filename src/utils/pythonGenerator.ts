import { CalculatorInputs } from '../types/calculator';

/**
 * Generates a clean, standalone, zero-dependency Python script (Python 3.8+)
 * with E24/E96 snapping, JSON file load/save support, and CLI execution.
 * Fully supports all SiC461 pins (MODE, FSW, PHASE1/2, BOOT, COMP, VSNS, VDRV, etc.)
 */
export function generatePythonScript(inputs: CalculatorInputs): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vishay SiC461 Synchronous Buck Converter Design Calculator
==========================================================
Standalone Engineering Script - Zero External Dependencies
Calculates all power stage and passive components for Vishay SiC461 (4.5V - 60V, 10A).
Supports all pins: MODE (27), fSW (24), PHASE1/2 (5,6), BOOT (4), COMP (21), VSNS (20), VDRV (16), EN (3), SS (19), ILIM (25).
Includes E24 / E96 series snapping and JSON import/export.
"""

import sys
import math
import json
from typing import Dict, Any, Tuple

# Standard E-series base values
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

def calculate_sic461(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Computes all passive and active components for Vishay SiC461 buck regulator."""
    vin_nom = float(inputs.get('vinNom', ${inputs.vinNom}))
    vin_min = float(inputs.get('vinMin', ${inputs.vinMin}))
    vin_max = float(inputs.get('vinMax', ${inputs.vinMax}))
    vout = float(inputs.get('vout', ${inputs.vout}))
    if 'rfb1Kohm' in inputs and 'vout' not in inputs:
        vout = 0.800 * (1.0 + float(inputs['rfb1Kohm']) / 10.0)
    iout = float(inputs.get('ioutMax', ${inputs.ioutMax}))
    fsw_khz = float(inputs.get('fswKhz', ${inputs.fswKhz}))
    if 'rfswKohm' in inputs and 'fswKhz' not in inputs:
        fsw_khz = (vout / (1.9e-10 * (float(inputs['rfswKohm']) * 1000) * 1000))
    kind = float(inputs.get('kind', ${inputs.kind}))
    vout_ripple_mv = float(inputs.get('voutRippleMaxMv', ${inputs.voutRippleMaxMv}))
    load_step = float(inputs.get('loadStepA', ${inputs.loadStepA}))
    overshoot_mv = float(inputs.get('voltageOvershootMv', ${inputs.voltageOvershootMv}))
    tss_ms = float(inputs.get('tssMs', ${inputs.tssMs}))
    if 'cssNf' in inputs and 'tssMs' not in inputs:
        tss_ms = (float(inputs['cssNf']) * 0.8) / 5.0
    vin_start_uvlo = float(inputs.get('vinStartUvlo', ${inputs.vinStartUvlo}))
    if 'ren1Kohm' in inputs and 'vinStartUvlo' not in inputs:
        vin_start_uvlo = 1.20 * (1.0 + float(inputs['ren1Kohm']) / 10.0)

    fsw = fsw_khz * 1000.0  # Hz
    vref = 0.800           # V

    # Duty Cycle & Timing
    eff_est = 0.92
    duty_nom = min(0.95, vout / (vin_nom * eff_est))
    duty_min = min(0.95, vout / (vin_max * eff_est))
    duty_max = min(0.95, vout / (vin_min * eff_est))

    tsw_ns = (1.0 / fsw) * 1e9
    ton_ns = (vout / (vin_max * fsw)) * 1e9
    toff_ns = tsw_ns - ton_ns

    # Inductor Selection (Vishay formula)
    ton_sec = vout / (vin_max * fsw)
    l_calc_h = ((vin_max - vout) * ton_sec) / (iout * kind)
    l_calc_uh = l_calc_h * 1e6
    l_nom_uh, l_err = find_nearest_standard(l_calc_uh, 'E24')
    l_nom_h = l_nom_uh * 1e-6

    # Actual ripple with chosen standard inductor
    actual_delta_il = ((vin_max - vout) * ton_sec) / l_nom_h
    actual_kind = actual_delta_il / iout
    i_peak = iout + (actual_delta_il / 2.0)
    i_valley = max(0.1, iout - (actual_delta_il / 2.0))
    i_rms = math.sqrt(iout**2 + (actual_delta_il**2)/12.0)

    # Output Capacitors (Cout)
    vout_ripple_v = vout_ripple_mv / 1000.0
    cout_ripple_min_uf = (actual_delta_il / (8.0 * fsw * vout_ripple_v)) * 1e6
    overshoot_v = overshoot_mv / 1000.0
    cout_transient_min_uf = ((l_nom_h * (load_step**2)) / (2.0 * vout * overshoot_v)) * 1e6
    cout_effective_min = max(cout_ripple_min_uf, cout_transient_min_uf)
    cout_target_uf = cout_effective_min / 0.60
    cout_single = 22.0 if cout_target_uf <= 80 else 47.0
    cout_qty = max(2, math.ceil(cout_target_uf / cout_single))
    total_cout_uf = cout_qty * cout_single

    # Input Capacitors (Cin)
    cin_rms = iout * math.sqrt(duty_nom * (1.0 - duty_nom))
    delta_vin = max(0.1, vin_min * 0.02)
    cin_min_uf = ((iout * duty_nom * (1.0 - duty_nom)) / (fsw * delta_vin)) * 1e6
    cin_target_uf = cin_min_uf / 0.50
    cin_single = 10.0 if cin_target_uf <= 40 else 22.0
    cin_qty = max(2, math.ceil(cin_target_uf / cin_single))
    total_cin_uf = cin_qty * cin_single

    # Frequency Resistor Rfsw (Pin 24)
    rfsw_calc_k = (vout / (1.9e-10 * fsw)) / 1000.0
    rfsw_nom_k, _ = find_nearest_standard(rfsw_calc_k, 'E96')

    # Mode Resistor Rmode (Pin 27)
    op_mode = int(inputs.get('operatingMode', ${inputs.operatingMode}))
    rmode_k = 2.0
    if op_mode == 2: rmode_k = 301.0
    elif op_mode == 3: rmode_k = 499.0
    elif op_mode == 4: rmode_k = 1000.0

    # Ripple Injection VSNS (Pin 20)
    prx_max = 0.025
    rx_calc_k = ((vin_max * vout * (1.0 - duty_min)) / prx_max) / 1000.0
    rx_nom_k, _ = find_nearest_standard(rx_calc_k, 'E96')
    cx_min_nf = (prx_max / (vin_max * fsw * 0.900)) * 1e9
    cx_nom_nf, _ = find_nearest_standard(cx_min_nf, 'E24')
    cy_calc_nf = (1.0 / (820.0 * fsw)) * 1e9
    cy_nom_nf, _ = find_nearest_standard(cy_calc_nf, 'E24')
    vramp_mv = (((vin_nom - vout) * vout) / (vin_nom * fsw * (cx_nom_nf * 1e-9) * (rx_nom_k * 1000.0))) * 1000.0

    # COMP Pin 21
    rcomp_calc_k = (1.0 / (1.8 * 300e-6 * (0.800 / vout))) / 1000.0
    rcomp_nom_k, _ = find_nearest_standard(rcomp_calc_k, 'E96')
    ccomp_calc_pf = ((5.0 * math.sqrt(l_nom_h * (total_cout_uf * 1e-6))) / (rcomp_nom_k * 1000.0)) * 1e12
    ccomp_nom_pf, _ = find_nearest_standard(ccomp_calc_pf, 'E24')

    # Current Limit ILIMIT (Pin 25)
    klim = 780.0
    rlim_k = klim / i_valley
    rlim_nom_k, _ = find_nearest_standard(rlim_k, 'E96')

    # Feedback Divider (Rfb1, Rfb2) - Vref = 0.8V
    rfb2_kohm = 10.0
    rfb1_calc_k = rfb2_kohm * ((vout / vref) - 1.0)
    rfb1_nom_k, rfb1_err = find_nearest_standard(rfb1_calc_k, 'E96')
    vout_actual = vref * (1.0 + (rfb1_nom_k / rfb2_kohm))
    vout_err = ((vout_actual - vout) / vout) * 100.0

    # Soft-Start Capacitor (Css)
    css_calc_nf = ((5.0e-6 * (tss_ms * 1e-3)) / vref) * 1e9
    css_nom_nf, css_err = find_nearest_standard(css_calc_nf, 'E24')
    actual_tss_ms = (css_nom_nf * 1e-9 * vref) / (5.0e-6) * 1000.0

    # UVLO Divider (EN pin 3)
    ren2_k = 10.0
    ren1_calc_k = ren2_k * ((vin_start_uvlo / 1.20) - 1.0)
    ren1_nom_k, _ = find_nearest_standard(ren1_calc_k, 'E96')
    actual_vin_start = 1.20 * (1.0 + (ren1_nom_k / ren2_k))
    actual_vin_stop = 1.10 * (1.0 + (ren1_nom_k / ren2_k))

    return {
        "inputs": inputs,
        "duty": round(duty_nom, 3),
        "ton_ns": round(ton_ns, 1),
        "toff_ns": round(toff_ns, 1),
        "l_calc_uh": round(l_calc_uh, 2),
        "l_nom_uh": l_nom_uh,
        "l_isat_min_a": round(i_peak * 1.3, 1),
        "actual_delta_il_a": round(actual_delta_il, 2),
        "i_peak_a": round(i_peak, 2),
        "i_rms_a": round(i_rms, 2),
        "cout_qty": cout_qty,
        "cout_single_uf": cout_single,
        "total_cout_uf": total_cout_uf,
        "cin_qty": cin_qty,
        "cin_single_uf": cin_single,
        "cin_rms_a": round(cin_rms, 2),
        "rfsw_kohm": rfsw_nom_k,
        "rmode_kohm": rmode_k,
        "rx_kohm": rx_nom_k,
        "cx_nf": cx_nom_nf,
        "cy_nf": cy_nom_nf,
        "vramp_mv": round(vramp_mv, 1),
        "rcomp_kohm": rcomp_nom_k,
        "ccomp_pf": ccomp_nom_pf,
        "rlim_kohm": rlim_nom_k,
        "rfb1_top_kohm": rfb1_nom_k,
        "rfb2_bot_kohm": rfb2_kohm,
        "vout_actual": round(vout_actual, 3),
        "vout_error_pct": round(vout_err, 2),
        "css_nf": css_nom_nf,
        "actual_tss_ms": round(actual_tss_ms, 2),
        "ren1_top_kohm": ren1_nom_k,
        "ren2_bot_kohm": ren2_k,
        "actual_vin_start": round(actual_vin_start, 2),
        "actual_vin_stop": round(actual_vin_stop, 2),
        "cboot_nf": 100,
        "rboot_ohm": 3.3,
        "cvdrv_uf": 4.7,
        "cvdd_uf": 1.0,
        "cvcin_uf": 0.1,
        "rpgood_kohm": 102
    }

def print_report(res: Dict[str, Any]):
    """Pretty prints the calculated components and ratings."""
    inp = res["inputs"]
    print("=" * 72)
    print(" VISHAY SiC461 SYNCHRONOUS BUCK REGULATOR - FULL DESIGN REPORT")
    print("=" * 72)
    print(f" Входное напряжение:   {inp.get('vinNom')} В (диапазон {inp.get('vinMin')} .. {inp.get('vinMax')} В)")
    print(f" Выходное напряжение:  {inp.get('vout')} В | Макс. ток нагрузки: {inp.get('ioutMax')} А")
    print(f" Частота коммутации:   {inp.get('fswKhz')} кГц | Коэффициент заполнения D: {res['duty']}")
    print(f" Время t_on (мин):     {res['ton_ns']} нс (порог кремния 90 нс)")
    print(f" Время t_off (мин):    {res['toff_ns']} нс (порог кремния 190 нс)")
    print("-" * 72)
    print(" ПОЛНАЯ СПЕЦИФИКАЦИЯ ПИНОВ И ПАССИВНЫХ КОМПОНЕНТОВ (СТР. 10 РИС. 10):")
    print(f"  • Пин 27 (MODE):      R_MODE = {res['rmode_kohm']} кОм (E96 1%) к AGND")
    print(f"  • Пин 24 (fSW):       R_FSW = {res['rfsw_kohm']} кОм (E96 1%) к AGND")
    print(f"  • Пины 5,6 (PHASE):   R_BOOT = {res['rboot_ohm']} Ом между PHASE1/2 и C_BOOT")
    print(f"  • Пин 4 (BOOT):       C_BOOT = {res['cboot_nf']} нФ (X7R >=25V) к R_BOOT")
    print(f"  • Пин 16 (VDRV):      C_VDRV = {res['cvdrv_uf']} мкФ (X7R >=10V) к PGND")
    print(f"  • Пин 20 (VSNS):      Cy = {res['cy_nf']} нФ (к выводу VSNS), Rx = {res['rx_kohm']} кОм (от SW), Cx = {res['cx_nf']} нФ (к VOUT) [Vramp = {res['vramp_mv']} мВ]")
    print(f"  • Пины 7-10 (SW):     Дроссель L1 = {res['l_nom_uh']} мкГн (Isat >= {res['l_isat_min_a']} А, Irms >= {res['i_rms_a']} А)")
    print(f"  • Выходные емкости:   {res['cout_qty']} x {res['cout_single_uf']} мкФ ({res['total_cout_uf']} мкФ X7R MLCC)")
    print(f"  • Входные емкости:    {res['cin_qty']} x {res['cin_single_uf']} мкФ ({res['total_cin_uf']} мкФ + 0.1 мкФ ВЧ)")
    print(f"  • Пин 22 (VFB):       R_FB_H = {res['rfb1_top_kohm']} кОм, R_FB_L = {res['rfb2_bot_kohm']} кОм (Vout={res['vout_actual']}В, погр. {res['vout_error_pct']}%)")
    print(f"  • Пин 19 (SS):        C_SS = {res['css_nf']} нФ (Tss = {res['actual_tss_ms']} мс)")
    print(f"  • Пин 3 (EN / UVLO):  R_EN_H = {res['ren1_top_kohm']} кОм, R_EN_L = {res['ren2_bot_kohm']} кОм (Vin_start={res['actual_vin_start']}В, Vin_stop={res['actual_vin_stop']}В)")
    print(f"  • Пин 25 (ILIMIT):    R_LIM = {res['rlim_kohm']} кОм к AGND")
    print(f"  • Пин 1 (VCIN):       C_VCIN = {res['cvcin_uf']} мкФ к AGND + RC фильтр 0..2.2 Ом")
    print(f"  • Пин 26 (VDD):       C_VDD = {res['cvdd_uf']} мкФ к AGND")
    print(f"  • Пин 2 (PGOOD):      R_PGOOD = {res['rpgood_kohm']} кОм подтяжка к VDD")
    print("=" * 72)

if __name__ == '__main__':
    config = {
        "vinNom": ${inputs.vinNom},
        "vinMin": ${inputs.vinMin},
        "vinMax": ${inputs.vinMax},
        "vout": ${inputs.vout},
        "ioutMax": ${inputs.ioutMax},
        "fswKhz": ${inputs.fswKhz},
        "kind": ${inputs.kind},
        "voutRippleMaxMv": ${inputs.voutRippleMaxMv},
        "loadStepA": ${inputs.loadStepA},
        "voltageOvershootMv": ${inputs.voltageOvershootMv},
        "tssMs": ${inputs.tssMs},
        "vinStartUvlo": ${inputs.vinStartUvlo},
        "operatingMode": ${inputs.operatingMode}
    }

    if len(sys.argv) > 1 and sys.argv[1].endswith('.json'):
        filename = sys.argv[1]
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                config.update(data.get('inputs', data))
                print(f"[OK] Параметры успешно загружены из '{filename}'")
        except Exception as e:
            print(f"[ОШИБКА] Не удалось прочитать '{filename}': {e}", file=sys.stderr)

    results = calculate_sic461(config)
    print_report(results)

    if '--export' in sys.argv:
        out_idx = sys.argv.index('--export') + 1
        out_file = sys.argv[out_idx] if out_idx < len(sys.argv) else 'sic461_calc_output.json'
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"[OK] Результаты расчета сохранены в '{out_file}'")
`;
}
