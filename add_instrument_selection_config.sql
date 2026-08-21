USE x4;
CREATE TABLE IF NOT EXISTS instrument_selection_config ( 
    id INT PRIMARY KEY, 
    b_Control_PID_Gas BOOLEAN DEFAULT FALSE, 
    b_PID_POSIC_SW BOOLEAN DEFAULT FALSE, 
    b_Sw_Wedge_Gas BOOLEAN DEFAULT FALSE, 
    b_SW_DIL_MEDIDO_CALC BOOLEAN DEFAULT FALSE, 
    b_Sw_Wedge_Gas_2 BOOLEAN DEFAULT FALSE, 
    b_SEL_LAMINAR BOOLEAN DEFAULT FALSE, 
    b_SEL_T_baja BOOLEAN DEFAULT FALSE, 
    b_sw_AM_Laminar_Wedge_x BOOLEAN DEFAULT FALSE, 
    b_sw_AM_Laminar_Wedge_y BOOLEAN DEFAULT FALSE, 
    b_sel_tipo_instrum_dil BOOLEAN DEFAULT FALSE,
    b_AUTO_GAS_01 BOOLEAN DEFAULT FALSE,
    b_SEL_VLV_GAS_01 BOOLEAN DEFAULT FALSE,
    b_DESHABILITA_PID BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
);
INSERT IGNORE INTO instrument_selection_config (
    id, b_Control_PID_Gas, b_PID_POSIC_SW, b_Sw_Wedge_Gas, b_SW_DIL_MEDIDO_CALC, 
    b_Sw_Wedge_Gas_2, b_SEL_LAMINAR, b_SEL_T_baja, b_sw_AM_Laminar_Wedge_x, 
    b_sw_AM_Laminar_Wedge_y, b_sel_tipo_instrum_dil, b_AUTO_GAS_01, b_SEL_VLV_GAS_01, 
    b_DESHABILITA_PID
) VALUES (1, false, false, false, false, false, false, false, false, false, false, false, false, false);
