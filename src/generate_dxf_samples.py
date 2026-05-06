"""
Generates diverse P&ID DXF samples for testing the SVG converter.
Each sample exercises different DXF entity types (LINE, ARC, CIRCLE, LWPOLYLINE,
INSERT, TEXT, MTEXT, ELLIPSE) so the converter can be validated thoroughly.
"""
import ezdxf
from ezdxf import const
import os
import math

OUT_DIR = "/home/claude/dxf_samples"
os.makedirs(OUT_DIR, exist_ok=True)


def add_pump_block(doc):
    """Reusable PUMP block: circle body + impeller triangle + nozzles."""
    blk = doc.blocks.new(name="PUMP")
    blk.add_circle((0, 0), 14, dxfattribs={"layer": "EQUIP_BODY"})
    blk.add_lwpolyline([(0, -14), (14, 0), (0, 14)], dxfattribs={"layer": "EQUIP_DETAIL", "closed": True})
    # Discharge nozzle (top)
    blk.add_lwpolyline([(-3, 14), (3, 14), (3, 20), (-3, 20)],
                       dxfattribs={"layer": "EQUIP_DETAIL", "closed": True})
    # Suction nozzle (left)
    blk.add_lwpolyline([(-14, -3), (-14, 3), (-22, 3), (-22, -3)],
                       dxfattribs={"layer": "EQUIP_DETAIL", "closed": True})


def add_valve_block(doc):
    """Reusable VALVE block: bowtie shape + stem."""
    blk = doc.blocks.new(name="VALVE")
    blk.add_lwpolyline([(-12, -10), (12, 10), (12, -10), (-12, 10)],
                       dxfattribs={"layer": "EQUIP_BODY", "closed": True})
    blk.add_line((0, 10), (0, 22), dxfattribs={"layer": "EQUIP_DETAIL"})
    blk.add_circle((0, 22), 4, dxfattribs={"layer": "EQUIP_DETAIL"})


def add_tank_block(doc):
    """Reusable TANK block: cylindrical body with elliptical heads."""
    blk = doc.blocks.new(name="TANK")
    blk.add_lwpolyline([(-18, -22), (18, -22), (18, 22), (-18, 22)],
                       dxfattribs={"layer": "EQUIP_BODY", "closed": True})
    blk.add_ellipse((0, 22), major_axis=(18, 0), ratio=0.28,
                    dxfattribs={"layer": "EQUIP_BODY"})
    blk.add_ellipse((0, -22), major_axis=(18, 0), ratio=0.28,
                    dxfattribs={"layer": "EQUIP_BODY"})


def add_instrument_block(doc):
    """Reusable INSTR block: ISA-style circle with horizontal bar."""
    blk = doc.blocks.new(name="INSTR")
    blk.add_circle((0, 0), 11, dxfattribs={"layer": "INSTR"})
    blk.add_line((-11, 0), (11, 0), dxfattribs={"layer": "INSTR"})


def add_exchanger_block(doc):
    """Reusable HX block: shell with tube indication."""
    blk = doc.blocks.new(name="HX")
    blk.add_lwpolyline([(-26, -16), (26, -16), (26, 16), (-26, 16)],
                       dxfattribs={"layer": "EQUIP_BODY", "closed": True})
    # Tube bundle hint
    for y in [-8, 0, 8]:
        blk.add_line((-22, y), (22, y), dxfattribs={"layer": "EQUIP_DETAIL"})
    # Heads
    blk.add_arc((-26, 0), radius=10, start_angle=90, end_angle=270,
                dxfattribs={"layer": "EQUIP_BODY"})
    blk.add_arc((26, 0), radius=10, start_angle=270, end_angle=90,
                dxfattribs={"layer": "EQUIP_BODY"})


def setup_layers(doc):
    layers_def = [
        ("EQUIP_BODY", 7),       # white/black
        ("EQUIP_DETAIL", 8),     # gray
        ("PROCESS", 1),          # red — process line
        ("SIGNAL", 4),           # cyan — signal line
        ("INSTR", 3),            # green
        ("TAGS", 2),             # yellow
        ("UTILITY", 5),          # blue
    ]
    for name, color in layers_def:
        if name not in doc.layers:
            doc.layers.add(name=name, color=color)


def add_blocks(doc):
    add_pump_block(doc)
    add_valve_block(doc)
    add_tank_block(doc)
    add_instrument_block(doc)
    add_exchanger_block(doc)


# ========================================================================
# SAMPLE 1: Simple linear flow — beginner test
# Tank → Pump → Valve → Heat Exchanger → Tank
# ========================================================================
def sample_01_simple_linear():
    doc = ezdxf.new("R2010", setup=True)
    setup_layers(doc)
    add_blocks(doc)
    msp = doc.modelspace()

    # Equipment placement
    placements = [
        ("TANK", (40, 100), "T-101"),
        ("PUMP", (140, 100), "P-101"),
        ("VALVE", (220, 100), "FCV-101"),
        ("HX", (320, 100), "E-201"),
        ("TANK", (440, 100), "T-202"),
    ]
    for blk_name, pos, tag in placements:
        msp.add_blockref(blk_name, pos, dxfattribs={"layer": "EQUIP_BODY"})
        msp.add_text(tag, height=4, dxfattribs={"layer": "TAGS"}).set_placement((pos[0], pos[1] - 32))

    # Process lines (connecting nozzles)
    process_segments = [
        ((58, 100), (118, 100)),     # T-101 → P-101 suction
        ((140, 120), (140, 130)),    # P-101 discharge stub
        ((140, 130), (220, 130)),    # to valve top
        ((220, 110), (220, 130)),    # valve stem region
        ((232, 100), (294, 100)),    # valve → HX
        ((346, 100), (422, 100)),    # HX → T-202
    ]
    for start, end in process_segments:
        msp.add_line(start, end, dxfattribs={"layer": "PROCESS"})

    # Instruments
    msp.add_blockref("INSTR", (140, 60), dxfattribs={"layer": "INSTR"})
    msp.add_text("PI-101", height=3, dxfattribs={"layer": "TAGS"}).set_placement((140, 45))
    msp.add_line((140, 71), (140, 86), dxfattribs={"layer": "SIGNAL"})

    msp.add_blockref("INSTR", (320, 60), dxfattribs={"layer": "INSTR"})
    msp.add_text("TI-201", height=3, dxfattribs={"layer": "TAGS"}).set_placement((320, 45))
    msp.add_line((320, 71), (320, 84), dxfattribs={"layer": "SIGNAL"})

    doc.saveas(f"{OUT_DIR}/01_simple_linear.dxf")
    print(f"  ✓ 01_simple_linear.dxf — 5 equipment, 6 process lines, 2 instruments")


# ========================================================================
# SAMPLE 2: Branching with arcs — exercises ARC entity
# Header pipe with two branches via elbows (arcs)
# ========================================================================
def sample_02_branching_with_arcs():
    doc = ezdxf.new("R2010", setup=True)
    setup_layers(doc)
    add_blocks(doc)
    msp = doc.modelspace()

    # Source tank
    msp.add_blockref("TANK", (40, 150), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("V-100", height=4, dxfattribs={"layer": "TAGS"}).set_placement((40, 118))

    # Header pipe
    msp.add_line((58, 150), (200, 150), dxfattribs={"layer": "PROCESS"})

    # Branch 1: arc elbow up → pump A
    msp.add_arc((200, 200), radius=50, start_angle=270, end_angle=360,
                dxfattribs={"layer": "PROCESS"})
    msp.add_line((250, 200), (300, 200), dxfattribs={"layer": "PROCESS"})
    msp.add_blockref("PUMP", (322, 200), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("P-101A", height=4, dxfattribs={"layer": "TAGS"}).set_placement((322, 168))

    # Branch 2: arc elbow down → pump B
    msp.add_arc((200, 100), radius=50, start_angle=0, end_angle=90,
                dxfattribs={"layer": "PROCESS"})
    msp.add_line((250, 100), (300, 100), dxfattribs={"layer": "PROCESS"})
    msp.add_blockref("PUMP", (322, 100), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("P-101B", height=4, dxfattribs={"layer": "TAGS"}).set_placement((322, 68))

    # Common discharge header
    msp.add_line((322, 222), (322, 240), dxfattribs={"layer": "PROCESS"})
    msp.add_line((322, 78), (322, 60), dxfattribs={"layer": "PROCESS"})

    doc.saveas(f"{OUT_DIR}/02_branching_with_arcs.dxf")
    print(f"  ✓ 02_branching_with_arcs.dxf — header + 2 branches, 2 arc elbows")


# ========================================================================
# SAMPLE 3: Custom geometry — no INSERT, raw entities only
# Tests converter handling of pure geometry without block references
# ========================================================================
def sample_03_raw_geometry():
    doc = ezdxf.new("R2010", setup=True)
    setup_layers(doc)
    msp = doc.modelspace()

    # Custom heater drawn directly with geometry
    cx, cy = 150, 100
    # Outer rect
    msp.add_lwpolyline([(cx-30, cy-20), (cx+30, cy-20), (cx+30, cy+20), (cx-30, cy+20)],
                       dxfattribs={"layer": "EQUIP_BODY", "closed": True})
    # Heating coils (zigzag using polyline)
    coil_pts = []
    for i in range(7):
        x = cx - 25 + i * 8
        y = cy + (5 if i % 2 == 0 else -5)
        coil_pts.append((x, y))
    msp.add_lwpolyline(coil_pts, dxfattribs={"layer": "EQUIP_DETAIL"})
    # Tag below
    msp.add_text("HEATER-301", height=4, dxfattribs={"layer": "TAGS"}).set_placement((cx, cy - 32))

    # Custom mixer: circle with internal X
    mx, my = 280, 100
    msp.add_circle((mx, my), 20, dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_line((mx - 14, my - 14), (mx + 14, my + 14), dxfattribs={"layer": "EQUIP_DETAIL"})
    msp.add_line((mx - 14, my + 14), (mx + 14, my - 14), dxfattribs={"layer": "EQUIP_DETAIL"})
    msp.add_text("MX-301", height=4, dxfattribs={"layer": "TAGS"}).set_placement((mx, my - 32))

    # Connecting pipe
    msp.add_line((180, 100), (260, 100), dxfattribs={"layer": "PROCESS"})

    # Inlet/outlet stubs
    msp.add_line((100, 100), (120, 100), dxfattribs={"layer": "PROCESS"})
    msp.add_line((300, 100), (340, 100), dxfattribs={"layer": "PROCESS"})

    doc.saveas(f"{OUT_DIR}/03_raw_geometry.dxf")
    print(f"  ✓ 03_raw_geometry.dxf — no blocks, raw lines/circles/polylines")


# ========================================================================
# SAMPLE 4: Reactor with mixed entities (ARC for dome heads, ELLIPSE for manholes)
# ========================================================================
def sample_04_reactor_complex():
    doc = ezdxf.new("R2010", setup=True)
    setup_layers(doc)
    add_blocks(doc)
    msp = doc.modelspace()

    # Vertical reactor
    cx, cy = 150, 120
    # Cylindrical shell
    msp.add_line((cx - 25, cy - 40), (cx - 25, cy + 40), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_line((cx + 25, cy - 40), (cx + 25, cy + 40), dxfattribs={"layer": "EQUIP_BODY"})
    # Top dome (arc)
    msp.add_arc((cx, cy + 40), radius=25, start_angle=0, end_angle=180,
                dxfattribs={"layer": "EQUIP_BODY"})
    # Bottom dome (arc)
    msp.add_arc((cx, cy - 40), radius=25, start_angle=180, end_angle=360,
                dxfattribs={"layer": "EQUIP_BODY"})
    # Manhole (ellipse on side)
    msp.add_ellipse((cx + 25, cy + 20), major_axis=(0, 5), ratio=0.4,
                    dxfattribs={"layer": "EQUIP_DETAIL"})
    # Top nozzle
    msp.add_lwpolyline([(cx - 4, cy + 65), (cx + 4, cy + 65), (cx + 4, cy + 75), (cx - 4, cy + 75)],
                       dxfattribs={"layer": "EQUIP_DETAIL", "closed": True})
    # Bottom outlet
    msp.add_lwpolyline([(cx - 4, cy - 75), (cx + 4, cy - 75), (cx + 4, cy - 65), (cx - 4, cy - 65)],
                       dxfattribs={"layer": "EQUIP_DETAIL", "closed": True})
    msp.add_text("R-401", height=5, dxfattribs={"layer": "TAGS"}).set_placement((cx, cy - 95))

    # Feed pipe with valve
    msp.add_line((50, cy + 70), (cx - 4, cy + 70), dxfattribs={"layer": "PROCESS"})
    msp.add_blockref("VALVE", (75, cy + 70), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("V-401", height=3, dxfattribs={"layer": "TAGS"}).set_placement((75, cy + 50))

    # Outlet pipe
    msp.add_line((cx, cy - 75), (cx, cy - 100), dxfattribs={"layer": "PROCESS"})
    msp.add_line((cx, cy - 100), (250, cy - 100), dxfattribs={"layer": "PROCESS"})

    # Pressure indicator on reactor
    msp.add_blockref("INSTR", (cx + 50, cy + 50), dxfattribs={"layer": "INSTR"})
    msp.add_text("PI-401", height=3, dxfattribs={"layer": "TAGS"}).set_placement((cx + 50, cy + 35))
    msp.add_line((cx + 25, cy + 50), (cx + 39, cy + 50), dxfattribs={"layer": "SIGNAL"})

    doc.saveas(f"{OUT_DIR}/04_reactor_complex.dxf")
    print(f"  ✓ 04_reactor_complex.dxf — vertical reactor with arc heads, ellipse manhole")


# ========================================================================
# SAMPLE 5: Korean tags + unknown blocks (real-world variation)
# ========================================================================
def sample_05_korean_unknown():
    doc = ezdxf.new("R2010", setup=True)
    setup_layers(doc)
    add_blocks(doc)

    # Add a non-standard block the converter won't recognize
    custom = doc.blocks.new(name="DRYER")
    custom.add_circle((0, 0), 18, dxfattribs={"layer": "EQUIP_BODY"})
    custom.add_lwpolyline([(-12, -12), (12, -12), (12, 12), (-12, 12)],
                          dxfattribs={"layer": "EQUIP_DETAIL", "closed": True})
    custom.add_text("D", height=8, dxfattribs={"layer": "EQUIP_DETAIL"}).set_placement((0, -4))

    msp = doc.modelspace()

    msp.add_blockref("TANK", (40, 100), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("원료조-101", height=4, dxfattribs={"layer": "TAGS"}).set_placement((40, 68))

    msp.add_blockref("PUMP", (140, 100), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("이송펌프", height=4, dxfattribs={"layer": "TAGS"}).set_placement((140, 68))

    msp.add_blockref("DRYER", (240, 100), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("건조기 D-201", height=4, dxfattribs={"layer": "TAGS"}).set_placement((240, 68))

    msp.add_blockref("TANK", (340, 100), dxfattribs={"layer": "EQUIP_BODY"})
    msp.add_text("제품조-201", height=4, dxfattribs={"layer": "TAGS"}).set_placement((340, 68))

    # Connections
    msp.add_line((58, 100), (118, 100), dxfattribs={"layer": "PROCESS"})
    msp.add_line((162, 100), (222, 100), dxfattribs={"layer": "PROCESS"})
    msp.add_line((258, 100), (322, 100), dxfattribs={"layer": "PROCESS"})

    doc.saveas(f"{OUT_DIR}/05_korean_unknown.dxf")
    print(f"  ✓ 05_korean_unknown.dxf — Korean tags, unknown DRYER block")


if __name__ == "__main__":
    print(f"Generating P&ID DXF samples → {OUT_DIR}/\n")
    sample_01_simple_linear()
    sample_02_branching_with_arcs()
    sample_03_raw_geometry()
    sample_04_reactor_complex()
    sample_05_korean_unknown()
    print(f"\nDone. Files in {OUT_DIR}/:")
    for f in sorted(os.listdir(OUT_DIR)):
        size = os.path.getsize(f"{OUT_DIR}/{f}")
        print(f"  {f:<35} {size:,} bytes")
