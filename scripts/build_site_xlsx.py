#!/usr/bin/env python3
"""
從 data/*.csv 產生 data/site.xlsx 模板。

用途：給維護者一份「上傳到 Google Sheets 的初始模板」。
之後維護者只在 Google Sheets 上編輯，這個 xlsx 不需要再改。
有需要重新生成時，執行：

    python3 scripts/build_site_xlsx.py

需求：openpyxl
    pip install openpyxl
"""
import csv
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUT_PATH = DATA_DIR / "site.xlsx"

# ============================================================
# Sheet 規範：順序、欄位、寬度、說明
# ============================================================
SHEETS = [
    {
        "name": "config",
        "csv": "config.csv",
        "fields": [
            ("key",   "設定鍵（請勿修改）", 22),
            ("value", "設定值",             50),
            ("note",  "說明（給維護者看的）", 30),
        ],
    },
    {
        "name": "classes",
        "csv": "classes.csv",
        "fields": [
            ("class_id",                "班級代號（英數，僅限 a-z 0-9 _，不可重複）", 18),
            ("name",                    "班級名稱（例：山柿班）",            14),
            ("series",                  "所屬系列（山野成長 / 自然探索 / 原野觀察）", 14),
            ("level",                   "難度（初階 / 中階 / 進階 / 挑戰 / 親子 / 探究）", 12),
            ("region",                  "地區（台北 / 台中 / 宜蘭 ...）",        10),
            ("price",                   "費用（整數，純數字）",                   10),
            ("age_range",               "年齡層（例：小一~小三）",                 14),
            ("experience_requirement",  "經驗（無 / 低頻率 / 中頻率 / 一定程度）",   14),
            ("duration_hours",          "每堂時數（整數）",                       10),
            ("transport_note",          "交通說明（例：大眾交通為主）",            22),
            ("activity_areas",          "活動範圍（用、頓號或逗號分隔）",          30),
            ("description",             "課程簡介（顯示於卡片）",                 40),
            ("display_order",           "顯示順序（小到大，整數）",                10),
        ],
    },
    {
        "name": "course_dates",
        "csv": "course_dates.csv",
        "fields": [
            ("class_id",     "班級代號（必須與 classes 表的 class_id 完全一致）", 18),
            ("session_no",   "第幾堂（整數）",                       10),
            ("date",         "日期（YYYY-MM-DD，例：2026-09-05）",   14),
            ("weekday",      "週幾（一字：六、日 …）",                 8),
            ("time_period",  "時段（full_day / morning / afternoon）", 12),
            ("notes",        "備註（可空，例：含接駁包車）",            24),
        ],
    },
    {
        "name": "faqs",
        "csv": "faqs.csv",
        "fields": [
            ("order",     "顯示順序（整數，小到大）", 8),
            ("category",  "分類（退費 / 報名 / 安全 …）", 10),
            ("question",  "問題",                  40),
            ("answer",    "答案（可 Alt+Enter 換行）", 60),
        ],
    },
]

HEADER_FILL = PatternFill("solid", fgColor="2D5F3F")
HEADER_FONT = Font(name="Noto Sans TC", color="FFFFFF", bold=True, size=11)
HEADER_ALIGN = Alignment(horizontal="left", vertical="center", wrap_text=True)
BODY_ALIGN = Alignment(vertical="top", wrap_text=True)
BODY_FONT = Font(name="Noto Sans TC", size=11)
NOTE_FILL = PatternFill("solid", fgColor="F4F1EA")
NOTE_FONT = Font(name="Noto Sans TC", color="6B6258", italic=True, size=10)
THIN = Side(border_style="thin", color="D6CFC0")
CELL_BORDER = Border(top=THIN, bottom=THIN, left=THIN, right=THIN)


def write_intro_sheet(wb):
    """寫一份說明 sheet 放在最前面"""
    ws = wb.create_sheet("說明", 0)
    ws.sheet_properties.tabColor = "A4C763"

    intro = [
        ("虎甲自然網站　資料規範", True, 16),
        ("", False, 11),
        ("這份試算表是網站所有內容的單一來源。維護者只要在這裡編輯，", False, 11),
        ("網站約 5 分鐘內就會自動更新（透過 Google Sheets 線上 CSV）。", False, 11),
        ("", False, 11),
        ("【sheet 一覽】", True, 12),
        ("　config        ── 站台設定（LINE 連結、Email、PDF 路徑）", False, 11),
        ("　classes       ── 班級清單（一列一班）", False, 11),
        ("　course_dates  ── 課程日期（一列一堂，用 class_id 關聯到班級）", False, 11),
        ("　faqs          ── 常見問題（一列一題）", False, 11),
        ("", False, 11),
        ("【新增班級的步驟】", True, 12),
        ("　1. 到 classes 表底下新增一列，填好欄位（class_id 不可重複）", False, 11),
        ("　2. 到 course_dates 表新增該班級的每堂課日期（class_id 要一致）", False, 11),
        ("　3. 存檔即可，網站約 5 分鐘內自動更新", False, 11),
        ("", False, 11),
        ("【新增 FAQ】", True, 12),
        ("　到 faqs 表新增一列，order 設大一點（例：99）就會排到最後", False, 11),
        ("　答案內要換行，按 Alt+Enter（Mac：Option+Enter）", False, 11),
        ("", False, 11),
        ("【修改站台設定】", True, 12),
        ("　到 config 表，修改對應 key 的 value 欄（key 欄勿動）", False, 11),
        ("", False, 11),
        ("【常見地雷】", True, 12),
        ("　• class_id 一定要英數小寫（a-z 0-9 _），中文會壞", False, 11),
        ("　• 日期欄請保持 YYYY-MM-DD 文字格式，不要讓 Google 自動轉成 9/5/2026", False, 11),
        ("　　（選欄→格式→數字→純文字，或在日期前面加一個半形單引號 ')", False, 11),
        ("　• 每張表第 1 列是欄位名稱（程式碼依賴），請勿刪除、勿更名", False, 11),
        ("　• 不要刪欄、不要插欄；若需新欄請先聯絡開發者", False, 11),
        ("　• 不要新增 sheet（沒被程式讀取的 sheet 會被忽略，但保持乾淨）", False, 11),
        ("", False, 11),
        ("【欄位說明】", True, 12),
        ("　每張表第 1 列的儲存格滑鼠移上去會看到該欄的說明。", False, 11),
        ("　欄位順序、名稱與此處 site.xlsx 一致時，網站就會正常顯示。", False, 11),
        ("", False, 11),
        ("最後更新：請依需要更新此處", False, 10),
    ]

    for idx, (text, bold, size) in enumerate(intro, start=1):
        cell = ws.cell(row=idx, column=1, value=text)
        cell.font = Font(name="Noto Sans TC", size=size, bold=bold,
                         color="2D5F3F" if bold else "333333")
        cell.alignment = Alignment(vertical="top", wrap_text=True)

    ws.column_dimensions["A"].width = 96
    ws.sheet_view.showGridLines = False


def write_data_sheet(wb, spec, csv_path):
    """寫一張資料 sheet（含表頭樣式、欄寬、凍結欄、欄位說明 comment）"""
    ws = wb.create_sheet(spec["name"])
    ws.sheet_properties.tabColor = "F2C744"

    field_names = [f[0] for f in spec["fields"]]
    field_notes = [f[1] for f in spec["fields"]]
    field_widths = [f[2] for f in spec["fields"]]

    # 表頭
    for col_idx, (name, note, _w) in enumerate(spec["fields"], start=1):
        cell = ws.cell(row=1, column=col_idx, value=name)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = HEADER_ALIGN
        cell.border = CELL_BORDER
        # 把欄位說明放成 comment（滑鼠移上去看）
        from openpyxl.comments import Comment
        cell.comment = Comment(note, "規範")

    # 欄寬
    for col_idx, w in enumerate(field_widths, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = w

    # 第 1 列高度（給 wrap_text 用）
    ws.row_dimensions[1].height = 28

    # 內容
    rows = []
    if csv_path.exists():
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append([r.get(name, "") for name in field_names])

    for row_idx, row in enumerate(rows, start=2):
        for col_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.alignment = BODY_ALIGN
            cell.font = BODY_FONT
            cell.border = CELL_BORDER

    # 凍結首列（第 2 列以下捲動，第 1 列固定）
    ws.freeze_panes = "A2"
    ws.sheet_view.zoomScale = 110


def main():
    wb = Workbook()
    # 移掉預設空白 sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    write_intro_sheet(wb)

    for spec in SHEETS:
        csv_path = DATA_DIR / spec["csv"]
        write_data_sheet(wb, spec, csv_path)

    wb.save(OUT_PATH)
    print(f"產生：{OUT_PATH.relative_to(DATA_DIR.parent)}")
    print(f"      sheet 數量：{len(wb.sheetnames)} → {wb.sheetnames}")


if __name__ == "__main__":
    main()
