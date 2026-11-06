#!/usr/bin/env python3
"""Build a conservative public, *unverified* catalog from a Telegram JSON export.

Only metadata supplied by Telegram (filename, caption, reported size and MIME) is
available: exported file payloads are omitted. Never infer what pages contain.
Run from any cwd: python scripts/build_resources.py
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".tools/ChatExport_2026-11-06/result.json"
CATALOG = ROOT / "src/data/resources.json"
REPORT = ROOT / "docs/resources-review.md"
URL = "https://t.me/ketabaph/{}"
FILE_OMITTED = "(File not included. Change data exporting settings to download.)"
TYPES = {"book", "solution_manual", "lecture_note", "exam", "assignment", "lab", "schedule", "manual", "educational_other"}
# Personal student submissions, group reports and score sheets must never be public.
PRIVATE_IDS = {4, 23, 24, 25, 26, 27, 28, 29, 67, 231, 232, 233, 234, 235}
# Filenames alone cannot establish an academic resource or safety for these items.
CONTEXTLESS_IDS = {13, 43, 47, 48, 61, 68, 69, 71, 80, 148, 260, 263, 264, 285, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 377}
# Manually enumerated *metadata-only* ambiguous cases, not judgments about bytes.
COURSE_RULES = (
    ("معادلات دیفرانسیل", ("معادلات", "moadelat", "diffeq", "differential equation", "ode", "boyce", "بویس", "براون", "braun")),
    ("ریاضی فیزیک", ("ریاضی فیزیک", "ریزفیز", "mathematical physics", "arfken", "صدری حسنی", "صدری_حسنی")),
    ("ریاضی ۲", ("ریاضی 2", "ریاضی ۲", "ریاضی۲", "math 2", "math2", "riz2", "آدامز", "adams", "stewart", "استوارت")),
    ("فیزیک ۲", ("فیزیک 2", "فیزیک۲", "فیزیک دو", "فیزیک ۲", "physics 2", "physics2")),
    ("فیزیک ۳", ("فیزیک 3", "فیزیک۳", "فیزیک ۳", "physics 3", "physics3")),
    ("فیزیک ۴", ("فیزیک 4", "فیزیک۴", "فیزیک ۴", "physics 4", "phys4")),
    ("الکترومغناطیس ۲", ("الکمغ2", "الکمغ 2", "الکترومغناطیس 2", "الکترومغناطیس۲", "الک مغ2", "الک مغ 2")),
    ("الکترومغناطیس ۱", ("الکمغ1", "الکمغ 1", "الکترومغناطیس 1", "الکترومغناطیس۱", "الک مغ1", "الک مغ 1")),
    ("الکترومغناطیس", ("الکترومغناطیس", "الکمغ", "الک مغ", "electrodynamics", "electromagnetism", "reitz", "milford", "گریفیث", "griffiths", "jackson", "جکسون")),
    ("مکانیک کوانتومی", ("کوانتوم", "quantum", "zettili", "شنکار", "shankar", "شوابل", "schwabl")),
    ("مکانیک کلاسیک", ("مکانیک تحلیلی", "مکتح", "classical mechanics", "classical dynamics", "goldstein", "گلدشتاین", "ماریون", "marion", "کلپنر", "kleppner", "taylor")),
    ("ترمودینامیک", ("ترمودینامیک", "ترمو", "thermodynamics", "thermal physics", "callen", "blundell", "زیمانسکی")),
    ("فیزیک جدید", ("فیزیک جدید", "فیزیک مدرن", "modern physics", "کرین", "krane", "thornton")),
    ("نسبیت", ("نسبیت", "relativity", "relativistic", "einstein")),
    ("کیهان‌شناسی", ("کیهان", "cosmology")),
    ("اخترفیزیک", ("اختر", "astro", "harwit")),
    ("نظریهٔ گروه", ("نظریه گروه", "نظریه_گروه", "group theory")),
    ("اپتیک", ("اپتیک", "optics", "guenther")),
    ("فیزیک حالت جامد", ("حالت جامد", "solid state")),
    ("مکانیک سیالات", ("مکانیک سیالات", "fluid mechanics")),
    ("آزمایشگاه فیزیک ۲", ("آز فیزیک 2", "آز فیزیک۲", "آز فیزیک دو", "آز فیزیک ۲", "سورس آز", "labratory 2", "az2")),
    ("مبانی فیزیک", ("مبانی فیزیک", "halliday", "هالیدی")),
    ("فیزیک امواج", ("فیزیک امواج", "physics of waves")),
)
EXAM = re.compile(r"امتحان|آزمون|میان\s?ترم|پایان\s?ترم|نمونه\s?سوال|نیم\s?ترم|mid[ -]?term|\bmid\b|\bfinal\b|\bexam\b|\bquiz\b|سوالات", re.I)
SOLUTION = re.compile(r"حل[ _‌-]*(?:ال)?مسا[ئأ]ل|حل[ _‌-]*تمرین|پاسخ(?:نامه|[ _‌-]*تشریحی)?|solution|solutions|answer|solucionario|حلل", re.I)
NOTES = re.compile(r"جزوه|درسنامه|lecture|notes|نوت|خلاصه[ _‌-]*نکات|اسلاید|syllabus|سیلابس", re.I)
SCHEDULE = re.compile(r"برنامه[ _‌-]*(?:امتحان|نیم[ _‌-]*سال|زمانی)|لیست[ _‌-]*(?:دروس|زمانی)|طرح[ _‌-]*درس|دروس[ _‌-]*(?:پیشنهادی|ارائه)|courselist", re.I)
LAB = re.compile(r"آزمایشگاه|آز[ _‌-]*فیزیک|سورس[ _‌-]*آز|\b(?:lab|labratory|az2)\b", re.I)
ASSIGNMENT = re.compile(r"تمرین|assignment|homework|\bhw\b", re.I)
BOOK = re.compile(r"کتاب|book|vol(?:ume)?|edition|\bed\b|مبانی|فیزیک|physics|mechanic|calculus|dynamics|thermo|optics| relativity|معادلات|ماتریس|tensors|astronom|cosmolog|نظریه|ste wart|schiavilla|georgi|blundell|weinberg|arfken|boyce|adams|milford|griffiths|zettili|jackson|marion|rindler|landau|landau|krane|ste wart|guenther|goldstein|bambi|carroll|شو|شناخت", re.I)
SENSITIVE = re.compile(r"ریز[ _‌-]*نمره|نمرات|grade(?:s|book)?|student[ _-]?id|[0-9]{9,12}|گروه[ _-]*[0-9]+.*گزارش|گزارش.*گروه[ _-]*[0-9]+", re.I)
MENTION = re.compile(r"@[A-Za-z0-9_.]+")
LINK = re.compile(r"https?://\S+", re.I)


def normalize(value: str) -> str:
    """Stable Persian/Arabic Unicode, numerals and spacing for matching only."""
    value = unicodedata.normalize("NFKC", str(value))
    value = value.translate(str.maketrans("يكىةۀأإؤٱ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "یکیههااوا01234567890123456789"))
    value = value.replace("\u200c", " ").replace("\u200f", " ").replace("ـ", "")
    return re.sub(r"\s+", " ", value).strip().casefold()


def flatten_text(text: object) -> str:
    if isinstance(text, str):
        return text
    if isinstance(text, list):
        return "".join(part if isinstance(part, str) else str(part.get("text", "")) for part in text if isinstance(part, (str, dict)))
    return ""


def clean_display(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).replace("\u200c", " ")
    value = MENTION.sub("", LINK.sub("", value))
    value = re.sub(r"(?:^|\s)\(\d+\)(?=\s|$)", "", value)
    value = re.sub(r"[\u200e\u200f\u2066-\u2069]", "", value)
    value = re.sub(r"[_]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip(" .-_،؛")
    return value


def caption_excerpt(caption: str) -> str | None:
    # Only quote compact, impersonal academic cues, never copy unrestricted prose.
    tokens = re.findall(r"#[\w\u200c]+", caption)
    cues = [clean_display(token.lstrip("#")) for token in tokens]
    cues = [cue for cue in cues if cue and not re.search(r"\d{9,}|دانشجو|گروه\d|[\w.+-]+@", cue)]
    return "، ".join(dict.fromkeys(cues[:5])) or None


def exclusion(message: dict, filename: str, caption: str) -> str | None:
    mid = message["id"]
    key = normalize(filename + " " + caption)
    # Links/handles may contain long numeric channel ids; these are not student ids.
    safe_key = normalize(LINK.sub("", MENTION.sub("", filename + " " + caption)))
    if mid in PRIVATE_IDS or (SENSITIVE.search(safe_key) and mid not in {207}) or "Ø±Û" in filename or "Ù†Ù" in filename:
        return "PRIVACY_STUDENT_OR_GRADE"
    if mid == 12 or re.search(r"(?:homework|\bhw[\d_-]|\bassignment\b)", normalize(filename)) and not ASSIGNMENT.search(normalize(caption)):
        return "POSSIBLE_STUDENT_SUBMISSION"
    if mid in CONTEXTLESS_IDS or (normalize(filename).startswith("camscanner") and not NOTES.search(normalize(caption)) and not SCHEDULE.search(normalize(caption)) and not EXAM.search(normalize(caption)) and "نسبیت" not in normalize(caption)):
        return "INSUFFICIENT_CONTEXT"
    if mid == 38:
        return "ASSESSMENT_CONTEXT"  # Caption describes a graded live test, not an archive sheet.
    if message.get("mime_type", "").startswith(("audio/", "video/")) or re.search(r"\.(?:mp3|mp4|mov|avi)$", filename, re.I):
        return "NON_RESOURCE_MEDIA"
    if mid in {149, 150, 151, 360, 366, 379} or "photo" in message and not filename:
        return "PHOTO_NOT_DOCUMENT"
    if normalize(filename) == "report.xls" or re.search(r"گزارش[ _‌-]*کار", key) and not LAB.search(key):
        return "POSSIBLE_STUDENT_SUBMISSION"
    if mid in {111}:  # The person's role in the note title is unknown.
        return "UNVERIFIED_AUTHOR_OR_REPORT"
    if not filename:
        return "NO_FILENAME"
    if not re.search(r"\.(pdf|djvu|zip|rar|xls|xlsx)$", filename, re.I):
        return "UNSUPPORTED_FORMAT"
    return None


def kind_for(filename: str, caption: str, mid: int) -> str | None:
    f, c = normalize(filename), normalize(caption)
    whole = f + " " + c
    # Do not classify an exam answer-key as a standalone textbook solution manual.
    if mid == 277:
        return "book"  # A named calculus problem book; 'sample questions' is its blurb.
    if mid == 271:
        return "schedule"  # A calendar of exam dates, not an exam paper.
    if mid == 86:
        return "assignment"  # Homework series with answers, not a book solution manual.
    if mid == 37:
        return "solution_manual"  # «حل آدامز جلد2» is expressly a worked-solutions title.
    if (EXAM.search(f) or EXAM.search(c) and ("نمونه" in c or "امتحان" in c or "میانترم" in c or "پایانترم" in c)) or mid in {63, 64, 236}:
        return "exam"
    if mid in {39, 322}:
        return "manual"
    if SCHEDULE.search(whole) or mid in {70, 81, 110, 170, 247, 271, 278, 280, 358, 363}:
        return "schedule"
    if LAB.search(whole) or mid in {19, 20, 21, 22}:
        return "lab"
    if SOLUTION.search(f) or SOLUTION.search(c) or mid in {31, 32, 35, 58, 60, 84, 167, 168, 200, 206, 207, 208, 222, 242, 243, 255, 258, 276, 283, 340}:
        return "solution_manual"
    if NOTES.search(whole) or mid in {10, 11, 16, 30, 33, 49, 93, 136, 227, 261, 267, 303, 305, 306, 307, 308, 309, 310, 318, 319, 348, 349, 350, 351, 352, 353, 354, 355, 369}:
        return "lecture_note"
    if ASSIGNMENT.search(f) or mid in {86}:
        return "assignment"
    if mid == 14:
        return "lab"
    if mid in {240, 284, 325, 328}:
        return "educational_other"  # Subject known, document genre unknown.
    if BOOK.search(whole) or mid in {2, 3, 6, 7, 15, 17, 18, 37, 42, 44, 45, 46, 62, 87, 109, 113, 117, 119, 120, 121, 122, 123, 124, 126, 130, 131, 132, 133, 138, 139, 154, 156, 158, 160, 161, 164, 165, 166, 174, 176, 178, 179, 180, 181, 183, 184, 188, 189, 192, 193, 194, 197, 201, 205, 208, 227, 246, 253, 258, 266, 269, 270, 272, 273, 275, 277, 282, 323, 324, 330, 331, 333, 334, 337, 339, 345, 346, 364, 365, 371, 372, 373, 374, 375}:
        return "book"
    return None


def explicit_teacher(caption: str) -> str | None:
    # Filename-only names are not evidence of an instructor role. Also don't
    # mistake 'written by' or a generic teaching resource for an instructor.
    match = re.search(r"(?:استاد|دکتر)[ _‌:]+([آ-ی]+(?:[ _‌-]+[آ-ی]+){0,2})", caption)
    if match:
        name = clean_display(match.group(1))
        name = re.split(r"[\n#@()،؛]|(?:\s+(?:درس|میانترم|پایانترم|جزوه|بهار|پاییز|منبع|سورس|جلسه|سال|ترم|زبان|هم|امتحان))", name)[0].strip()
        return name if name and len(name) < 55 else None
    # A hashtag name alone does not prove teaching; require a same-caption
    # instructional cue in the absence of the explicit professor role word.
    if re.search(r"(?:جزوه|سورس اصلی|منبع درس)\b", caption):
        match = re.search(r"#(معمارزاده|مقیمی|سیدریحانی|رحیمی‌تبار)", caption)
        if match and "استاد" in caption:
            return clean_display(match.group(1))
    return None


def find_course(filename: str, caption: str, kind: str) -> str | None:
    """Attach a course only when visibly indicated, never by an author's name."""
    if kind == "schedule":
        return None
    f, c = normalize(filename), normalize(caption)
    if kind == "educational_other":
        return "الکترومغناطیس" if ("الکترومغناطیس" in f or "الک مغ" in f) else None
    if kind == "manual" and "معادلات دیفرانسیل" in f:
        return "معادلات دیفرانسیل"
    if kind == "manual" and "لایه های نازک" in f:
        return "لایه‌های نازک"
    if kind == "exam" and ("معادلات دیفرانسیل" in c or "فیزیک" in c):
        for course in ("معادلات دیفرانسیل", "فیزیک ۲", "فیزیک ۳", "فیزیک ۴"):
            if normalize(course) in c:
                return course
    if kind == "solution_manual" and re.search(r"الکترومغناطیس\s*2|الک\s*مغ\s*2", f):
        return "الکترومغناطیس ۲"
    if "نسبیت" in c and "relativistic electromagnetism" in c:
        return "نسبیت"
    if kind == "lab" and ("آز فیزیک 2" in f or "سورس آز فیزیک 2" in f):
        return "آزمایشگاه فیزیک ۲"
    if kind == "assignment" and "ریاضی 2" in c:
        return "ریاضی ۲"
    if "ریاضی عمومی" in f or "ریاضی عمومی" in c:
        return "ریاضی عمومی"
    if kind == "lecture_note" and "ریاضی" in c and re.search(r"(?:ریاضی\s*2|ریاضی_2)", c):
        return "ریاضی ۲"
    both = f + " " + c
    if re.search(r"کوانتوم\s*1\s*و\s*2|کوانتوم\s*۱\s*و\s*۲", both):
        return "کوانتوم ۱ و ۲"
    if re.search(r"کوانتوم\s*[۱1]|\bqm1\b", both):
        return "کوانتوم ۱"
    if re.search(r"کوانتوم\s*[۲2]|\bqm2\b", both):
        return "کوانتوم ۲"
    if "غیرنسبیتی" in c or "غیر نسبیتی" in c:
        if "کوانتوم" in c or "quantum" in f:
            return "مکانیک کوانتومی"
    if "آشنایی با نسبیت عام" in c:
        return "آشنایی با نسبیت عام"
    if "فیزیک امواج" in f or "physics of waves" in f:
        return "فیزیک امواج"
    # Prefixes belonging to an unrelated book's author are not course claims.
    if re.search(r"(?<!\w)(?:ode|ode-mid|physics[ _-]?[234]|phys[ _-]?[234]|qm[ _-]?[12]|math[ _-]?2)(?!\w)", f):
        for course, aliases in COURSE_RULES:
            if any(normalize(alias) in f for alias in aliases) and course not in {"مکانیک کلاسیک", "ترمودینامیک", "فیزیک جدید"}:
                return course
    if kind in {"exam", "lecture_note", "lab", "assignment"}:
        for course, aliases in COURSE_RULES:
            if any(normalize(alias) in both for alias in aliases if len(normalize(alias)) > 3 and normalize(alias) not in {"taylor", "guenther", "معادلات"}):
                return course
    if kind in {"book", "solution_manual"}:
        for course, aliases in COURSE_RULES:
            if course in {"فیزیک جدید", "مکانیک کلاسیک", "ترمودینامیک", "نسبیت", "اپتیک", "مکانیک کوانتومی", "ریاضی فیزیک", "الکترومغناطیس", "فیزیک امواج", "اخترفیزیک"} and (normalize(course) in f or normalize(course) in c):
                return course
        # Explicit subject in title, but do not assign a numbered syllabus.
        if "quantum" in f:
            return "مکانیک کوانتومی"
        if "electrodynamics" in f or "electromagnetism" in f:
            return "الکترومغناطیس"
        if "thermodynamics" in f or "thermal physics" in f:
            return "ترمودینامیک"
        if "optics" in f:
            return "اپتیک"
        if "differential equations" in f or "معادلات دیفرانسیل" in f:
            return "معادلات دیفرانسیل"
    return None


def edition_for(filename: str, caption: str) -> str | None:
    text = normalize(filename + " " + caption)
    match = re.search(r"(?:ویرایش|ویراست|edition|\bed\b)\s*(\d{1,2})(?!\d)", text)
    if not match:
        match = re.search(r"\b(\d{1,2})(?:st|nd|rd|th|e|ed)(?!\w)", text)
    return f"{match.group(1)}" if match else None


def language_for(caption: str) -> str | None:
    text = normalize(caption)
    if "فارسی" in text or "ترجمه" in text:
        return "fa"
    if "انگلیسی" in text or "زبان اصلی" in text:
        return "en"
    return None


def summary_for(kind: str, title: str, course: str | None, filename: str, caption: str, edition: str | None, language: str | None, teacher: str | None) -> str:
    """Source-specific metadata description, with no claims about document pages."""
    label = {"book": "عنوان کتاب یا منبع", "solution_manual": "عنوان حل‌المسائل یا پاسخنامه", "lecture_note": "عنوان جزوه/درسنامه", "exam": "برگهٔ امتحان یا نمونه‌سؤال", "assignment": "مجموعه‌تمرین", "lab": "فایل آزمایشگاهی", "schedule": "فهرست/برنامهٔ درسی", "manual": "طرح درس یا سیلابس", "educational_other": "منبع آموزشی"}[kind]
    details = [f"{label}: {title}"]
    if course:
        details.append(f"موضوع/درس: {course}")
    if teacher:
        details.append(f"نام استاد در کپشن: {teacher}")
    if edition:
        details.append(f"ویرایش درج‌شده: {edition}")
    if language:
        details.append(f"زبان درج‌شده در کپشن: {'فارسی' if language == 'fa' else 'انگلیسی'}")
    # Explicit time/part markers present in this record's metadata only.
    cue = re.search(r"(?:جلد[ _‌-]*[۰-۹0-9]+|فصل[ _‌-]*[۰-۹0-9]+|جلسه[ _‌:-]*[۰-۹0-9]+|نیمسال[ _‌-]*(?:اول|دوم|[۰-۹0-9-]+)|(?:بهار|پاییز)[ _‌-]*[۰-۹0-9]+|سال[ _‌-]*[۰-۹0-9]+)", caption)
    if cue:
        details.append(f"جزئیات کپشن: {clean_display(cue.group(0))}")
    # Include short explicit caption context beyond title while ensuring no
    # student IDs, usernames, phone numbers or unrelated links leave the export.
    safe_caption = clean_display(caption)
    safe_caption = re.sub(r"[^\w\s#،؛.()/-]", " ", safe_caption)
    safe_caption = re.sub(r"\s+", " ", safe_caption).strip()
    if safe_caption and not re.search(r"(?:دانشجو|خانم|آقای|تماس|شماره|رمز|پسوورد|\d{9,})", safe_caption):
        sentences = re.split(r"[\n.!؟]", safe_caption)
        meaningful = [s.strip(" #-،؛:") for s in sentences if len(s.strip(" #-،؛:")) > 10]
        if meaningful:
            excerpt = meaningful[0][:115].strip()
            if excerpt and normalize(excerpt) not in normalize(title):
                details.append(f"توضیح کوتاه کپشن: {excerpt}")
    if caption and not any("توضیح کوتاه کپشن:" in part for part in details):
        concise = clean_display(caption).strip(" #،؛. ")
        if 8 <= len(concise) <= 110 and not re.search(r"(?:دانشجو|خانم|آقای|تماس|شماره|رمز|پسوورد|\d{9,})", concise):
            if normalize(concise) not in normalize(title):
                details.append("کپشن: " + concise)
    return "؛ ".join(details) + "."


# Human-curated, metadata-only blurbs for records with especially useful caption
# context. These are NOT summaries of PDF contents: no media bytes were exported.
# Keep them keyed to a message ID, rather than borrowing context from nearby posts.
# These titles only use facts stated on the SAME message; never infer a title
# from adjacent messages in a batch or an unidentified media group.
CURATED_TITLES = {
    16: "جزوهٔ ریاضی ۲ پورنکی، جلسهٔ ۷",
    19: "فایل فشردهٔ آزمایشگاه فیزیک ۲ (نام فایل: az2)",
    30: "جزوهٔ ریاضی ۲ پورنکی، جلسات ۳ تا ۵",
    140: "میان‌ترم الکترومغناطیس ۱ بهمن‌آبادی، پاییز ۹۹",
    141: "پاسخ میان‌ترم الکترومغناطیس ۱ بهمن‌آبادی، پاییز ۹۹",
    224: "پاسخ میان‌ترم اول الکترومغناطیس ۲ بهمن‌آبادی، پاییز ۱۴۰۲",
    278: "برنامهٔ نیمسال اول ۱۴۰۴–۱۴۰۵",
    287: "پایان‌ترم الکترومغناطیس ۲ بهمن‌آبادی، بهار ۱۴۰۰",
    318: "قسمت دوم جزوهٔ نسبیت ابوالحسنی",
}

CURATED_SUMMARIES = {
    2: "نام فایل، ویرایش هفتم Mathematical Methods for Physicists اثر آرفکن را مشخص می‌کند؛ دربارهٔ محتوای نسخهٔ بارگذاری‌شده اطلاعات بیشتری در اکسپورت نیست.",
    3: "نام فایل به حل‌المسائل ویرایش هفتم Mathematical Methods for Physicists اشاره دارد؛ پیوند به رکورد کتاب ۲ صرفاً بر پایهٔ عنوان مشترک است.",
    10: "بنا بر کپشن، جزوهٔ سه جلسهٔ اول ریاضی ۲ کلاس پورنکی است؛ نام فایل به‌تنهایی این تفکیک را نشان نمی‌دهد.",
    11: "بنا بر کپشن، جزوهٔ سه جلسهٔ دوم ریاضی ۲ کلاس پورنکی است؛ با جزوهٔ سه جلسهٔ اول در پست ۱۰ اشتباه نشود.",
    16: "کپشن، این اسکن را جزوهٔ جلسهٔ هفتم ریاضی ۲ کلاس پورنکی با تاریخ ۳۰ بهمن معرفی می‌کند.",
    19: "نام فایل az2.zip به آزمایشگاه فیزیک ۲ اشاره دارد؛ محتویات آرشیو در اکسپورت قابل مشاهده نیستند.",
    30: "کپشن، این فایل عمومی‌نام را جزوهٔ کلاس‌های ۳ تا ۵ ریاضی ۲ استاد پورنکی معرفی می‌کند.",
    31: "نام فایل، حل تمرین‌های دانشجویی معادلات دیفرانسیل بویس و دی‌پریما را نشان می‌دهد؛ کپشن از ویرایش هشتم یاد می‌کند.",
    32: "نام فایل به حل‌المسائل ویرایش یازدهم معادلات دیفرانسیل بویس اشاره دارد؛ کپشن آن را دست‌نویس توصیف می‌کند.",
    45: "نام فایل عنوان Physics of Waves و نام Georgi را همراه سال ۱۹۹۳ دارد؛ نسبت آن با یک درس یا مدرس مشخص در کپشن بیان نشده است.",
    93: "کپشن، این جزوه را خلاصه‌ای دربارهٔ دستگاه معادلات دیفرانسیل معرفی می‌کند؛ دامنهٔ دقیق فصل‌ها بررسی نشده است.",
    140: "کپشن، میان‌ترم الکترومغناطیس ۱ بهمن‌آبادی در پاییز ۹۹ را مشخص می‌کند؛ نام file.pdf برای شناسایی برگه کافی نیست.",
    141: "کپشن، فایل پاسخ میان‌ترم الکترومغناطیس ۱ بهمن‌آبادی در پاییز ۹۹ را مشخص می‌کند؛ هم‌نامی با پست ۱۴۰ نشانهٔ یکسان‌بودن فایل‌ها نیست.",
    143: "نام فایل و هشتگ‌ها به میان‌ترم دوم الکترومغناطیس ۱ باغرام در پاییز ۱۴۰۲ اشاره دارند.",
    224: "کپشن، با وجود هشتگ پایان‌ترم، در متن آزاد صریحاً این اسکن را پاسخ میان‌ترم اول الکترومغناطیس ۲ بهمن‌آبادی در پاییز ۱۴۰۲ معرفی می‌کند؛ نوع آزمون نیازمند بازبینی است.",
    278: "کپشن برنامهٔ نیمسال اول سال تحصیلی ۱۴۰۴–۱۴۰۵ را معرفی می‌کند؛ جزئیات روزها و کلاس‌ها از فایل بررسی نشده است.",
    287: "هشتگ‌های پست، فایل عمومی‌نام را پایان‌ترم الکترومغناطیس ۲ بهمن‌آبادی در بهار ۱۴۰۰ معرفی می‌کنند.",
    318: "کپشن، این اسکن را قسمت دوم جزوهٔ نسبیت استاد ابوالحسنی معرفی می‌کند و به الکترومغناطیس نسبیتی اشاره دارد.",
    144: "نام فایل و هشتگ‌ها به میان‌ترم اول الکترومغناطیس ۱ باغرام در پاییز ۱۴۰۲ اشاره دارند؛ با میان‌ترم دوم پست ۱۴۳ متفاوت است.",
    154: "نام فایل و کپشن، کتاب Classical Dynamics ماریون را با ویرایش پنجم معرفی می‌کنند؛ محتوای نسخهٔ PDF بررسی نشده است.",
    178: "کپشن، Concepts in Thermal Physics بلاندل (ویرایش دوم در نام فایل) را منبع ترمو ۱ رضاخانی می‌نامد؛ نقش او به‌عنوان مدرس صراحت ندارد.",
    179: "کپشن، Astrophysical Concepts هارویت را منبع اخترفیزیک معرفی می‌کند؛ ویرایش و مدرس در این پست معلوم نیست.",
    180: "کپشن، Group Theory in a Nutshell for Physicists اثر A. Zee را منبع نظریهٔ گروه‌ها معرفی می‌کند؛ اعداد انتهای نام فایل ویرایش قطعی نیستند.",
    181: "کپشن، جلد سوم مجموعهٔ لاندائو و لیفشیتز را با موضوع مکانیک کوانتومی غیرنسبیتی معرفی می‌کند؛ آن را منبع درس نسبیت طبقه‌بندی نکنید.",
    205: "نام فایل و هشتگ‌های کپشن، Classical Mechanics تیلور را به‌عنوان کتاب زبان انگلیسی معرفی می‌کنند.",
    206: "نام فایل و هشتگ‌های کپشن، حل‌المسائل انگلیسی Classical Mechanics تیلور را معرفی می‌کنند؛ با کتاب پست ۲۰۵ مرتبط است.",
    253: "کپشن، ODE Braun را ترجمهٔ فارسی کتاب معادلات دیفرانسیل مارتین براون معرفی می‌کند؛ نسخهٔ فایل بررسی نشده است.",
    305: "کپشن، QM1 را جزوهٔ کوانتوم ۱ با برچسب معمارزاده معرفی می‌کند؛ نقش نویسنده یا مدرس از برچسب به‌تنهایی قطعی نیست.",
    306: "کپشن، QM2 را جزوهٔ کوانتوم ۲ با برچسب معمارزاده معرفی می‌کند؛ عدد داخل پرانتز نام فایل شمارهٔ ویرایش نیست.",
    307: "کپشن، فایل Group Theory را جزوهٔ نظریهٔ گروه با برچسب معمارزاده معرفی می‌کند؛ ویرایش آن معلوم نیست.",
    308: "کپشن، Solid State را جزوهٔ حالت جامد با برچسب مقیمی معرفی می‌کند؛ نویسندهٔ جزوه احراز نشده است.",
    309: "کپشن، Optics را جزوهٔ اپتیک با برچسب سیدریحانی معرفی می‌کند؛ از کتاب منبع اپتیک در پست ۳۷۱ جداست.",
    310: "کپشن، Fluid Mechanics را جزوهٔ مکانیک سیالات با برچسب رحیمی‌تبار معرفی می‌کند؛ نویسندهٔ جزوه احراز نشده است.",
    322: "نام فایل، سیلابس درس لایه‌های نازک را نشان می‌دهد؛ سرفصل‌های داخل سند در این اکسپورت قابل بررسی نیستند.",
    323: "نام فایل تنها Ohring است؛ از مجاورت آن با سیلابس پست ۳۲۲ نمی‌توان عنوان کتاب یا نسبت قطعی به درس را نتیجه گرفت.",
    324: "نام فایل فقط رشته‌ای شبیه شناسهٔ کتاب است؛ عنوان اثر، موضوع و ویرایش در فرادادهٔ این پست معلوم نیستند.",
    365: "طبق کپشن، Quantum Mechanics شوابل با ویرایش چهارم در نام فایل، به‌عنوان منبع کوانتوم ۱ و ۲ استاد صدوقی معرفی شده است.",
    371: "کپشن، Modern Optics Simplified گونتر را منبع اصلی انگلیسی اپتیک استاد سیدریحانی معرفی می‌کند.",
    372: "نام فایل فقط Herbert Goldstein و Charles P. Poole را دارد؛ عنوان اثر، درس و ارتباط آن با کپشن پست‌های بعدی تأیید نشده‌اند.",
    373: "نام فایل فقط Carroll SG است؛ با وجود هم‌زمانی با پست‌های دیگر، کپشنی برای انتساب آن به درس یا مدرس وجود ندارد.",
    374: "نام فایل به Introduction to General Relativity اثر Bambi و ویرایش اول اشاره دارد؛ کپشن یا انتساب قطعی به درس این پست وجود ندارد.",
    375: "کپشن، Introducing Einstein’s Relativity اثر Ray d’Inverno را در شمار منابع آشنایی با نسبیت عام استاد خسروی معرفی می‌کند؛ عنوان از نام فایل آمده است.",
}


def make_title(filename: str, caption: str, kind: str) -> str:
    stem = re.sub(r"\.(pdf|djvu|zip|rar|xls|xlsx)$", "", filename, flags=re.I)
    stem = clean_display(stem)
    # Distinguish signed scans by their explicitly descriptive caption cues.
    # A filename like file.pdf has no descriptive title; use explicit caption cues.
    if normalize(stem) in {"file", "new document(4)", "math 2 (2)", "math 2", "thermo1", "phys4 mid", "r2", "riz2"}:
        cues = caption_excerpt(caption)
        if cues:
            suffix = ""
            if "جلسه اول" in caption:
                suffix = " — سه جلسهٔ اول"
            elif "جلسه دوم" in caption:
                suffix = " — سه جلسهٔ دوم"
            return f"{stem} — {cues}{suffix}"
    return stem


def duplicate_key(rec: dict) -> tuple[str, int | None, str]:
    name = normalize(rec["evidence"]["fileName"] or "")
    name = re.sub(r"\s*\(\d+\)(?=\.[a-z]+$)", "", name)
    return (name, rec["sizeBytes"], rec["format"] or "")


def run() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    messages = [m for m in data["messages"] if any(k in m for k in ("file", "file_name", "photo"))]
    published: list[dict] = []
    rejected: list[tuple[int, str]] = []
    for message in messages:
        mid = message["id"]
        filename = str(message.get("file_name") or "")
        caption = flatten_text(message.get("text", ""))
        reason = exclusion(message, filename, caption)
        if not reason and (kind := kind_for(filename, caption, mid)) is None:
            reason = "EDUCATIONAL_STATUS_UNCLEAR"
        if reason:
            rejected.append((mid, reason))
            continue
        # Never put potentially identifying labels in public titles or evidence.
        safe_file = clean_display(filename)
        if SENSITIVE.search(normalize(safe_file)) or re.search(r"\d{9,}", safe_file):
            rejected.append((mid, "PRIVACY_STUDENT_OR_GRADE"))
            continue
        title = CURATED_TITLES.get(mid) or make_title(filename, caption, kind)
        if not title:
            rejected.append((mid, "INSUFFICIENT_CONTEXT"))
            continue
        course = find_course(filename, caption, kind)
        teacher = explicit_teacher(caption)
        suffix = Path(filename).suffix.lower().lstrip(".")
        size = message.get("file_size")
        source_url = URL.format(mid)
        edition = edition_for(filename, caption)
        language = language_for(caption)
        record = {"id": mid, "title": title, "type": kind, "kind": kind,
                  "course": course, "teacher": teacher, "professor": teacher,
                  "author": None, "edition": edition,
                  "language": language,
                  "sizeBytes": size if isinstance(size, int) and size >= 0 else None,
                  "format": suffix or None,
                  "summary": CURATED_SUMMARIES.get(mid) or summary_for(kind, title, course, safe_file, caption, edition, language, teacher),
                  "sourceUrl": source_url, "sourceMessageId": mid,
                  "access": {"kind": "telegram_post", "url": source_url},
                  "reviewStatus": "needs_review",
                  "evidence": {"fileName": safe_file, "captionExcerpt": caption_excerpt(caption),
                               "scope": "filename_and_caption_only", "fileAvailability": "omitted_from_export"},
                  "relations": {"duplicateOf": None, "solutionFor": None}}
        published.append(record)
    seen: dict[tuple[str, int | None, str], int] = {}
    for rec in published:
        key = duplicate_key(rec)
        if key in seen:
            rec["relations"]["duplicateOf"] = seen[key]
        else:
            seen[key] = rec["id"]
    # Link only plainly corresponding bibliographic filenames; no adjacent-post
    # pairing and no inferred book/edition cross-links.
    solution_pairs = {3: 2, 107: 106, 206: 205, 255: 254, 160: 158, 340: 339}
    by_id = {r["id"]: r for r in published}
    for solution_id, book_id in solution_pairs.items():
        if solution_id in by_id and book_id in by_id and by_id[solution_id]["type"] == "solution_manual" and by_id[book_id]["type"] == "book":
            by_id[solution_id]["relations"]["solutionFor"] = book_id
    assert len(by_id) == len(published), "Duplicate Telegram message IDs"
    assert len(messages) == len(published) + len(rejected)
    assert all(r["type"] in TYPES and r["access"]["kind"] == "telegram_post" for r in published)
    assert all(r["reviewStatus"] == "needs_review" and r["sourceUrl"] == URL.format(r["id"]) for r in published)
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(json.dumps(published, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    reasons = Counter(code for _, code in rejected)
    kinds = Counter(r["type"] for r in published)
    dupes = [r for r in published if r["relations"]["duplicateOf"] is not None]
    report = ["# گزارش بازبینی منابع تلگرام", "", "این خروجی با `python scripts/build_resources.py` از `.tools/ChatExport_2026-11-06/result.json` محلی بازتولید می‌شود. فقط فرادادهٔ نام فایل و کپشن استخراج شده است؛ خود فایل‌ها در خروجی تلگرام **حذف شده‌اند**. محتوای صفحه‌ها، اصالت سند، حقوق نشر و صحت پیوند عمومی بررسی نشده‌اند.", "", "## شمارش", "", f"- پیام‌های دارای فایل/رسانه: **{len(messages)}**", f"- نامزدهای آموزشیِ بی‌اطلاعات شخصی در کاتالوگ (`needs_review`): **{len(published)}**", f"- کنارگذاشته‌شده: **{len(rejected)}**", f"- تکرارهای احتمالی حفظ‌شده با شناسهٔ مستقل (`relations.duplicateOf`): **{len(dupes)}**", "", "گروه‌بندی کاتالوگ: " + "، ".join(f"`{k}`: {v}" for k, v in sorted(kinds.items())) + ".", "", "پیوند `https://t.me/ketabaph/{id}` فقط نشانی **پست تلگرام** (`telegram_post`) است، نه دانلود مستقیم یا تضمین وجود فایل؛ شناسهٔ کانال در ریشهٔ export ثبت شده (`2168804678`)، اما فیلد مستقل username در ریشه نیست؛ پیام فهرست `327` نشانی‌های صریح `https://t.me/ketabaph/{id}` را نشان می‌دهد. وجود همهٔ پیوندها و دسترسی به فایل‌ها مستقل تأیید نشده است. قبل از انتشار عمومی پیوندها/بازنشر فایل، اصالت کانال، اجازهٔ صاحب‌حق و نبود دادهٔ خصوصی بررسی انسانی می‌خواهد.", "", "## علت‌های حذف (شناسه‌ها بدون نام یا فرادادهٔ حساس)", ""]
    descriptions = {"PRIVACY_STUDENT_OR_GRADE": "برگهٔ نمره یا تکلیف/گزارش گروهی قابل‌شناسایی", "POSSIBLE_STUDENT_SUBMISSION": "احتمال تکلیف فردی یا گزارش‌کار دانشجو", "UNVERIFIED_AUTHOR_OR_REPORT": "ابهام نقش نام شخص در عنوان یا گزارشِ بدون زمینه", "INSUFFICIENT_CONTEXT": "نام عمومی، اسکن بی‌شرح، فصل بدون اثر مشخص یا پیام حذف‌شده", "EDUCATIONAL_STATUS_UNCLEAR": "آموزشی‌بودن از فراداده روشن نیست", "ASSESSMENT_CONTEXT": "متن به آزمون زمان‌دارِ نمره‌دار اشاره دارد، نه سند آرشیویِ قابل‌تأیید", "NON_RESOURCE_MEDIA": "صوت/ویدئو بدون شاهد کافی برای یک منبع آموزشی", "PHOTO_NOT_DOCUMENT": "عکس رویداد/عکس بی‌موضوع و بدون سند آموزشی", "NO_FILENAME": "نام فایل در داده وجود ندارد", "UNSUPPORTED_FORMAT": "قالب ناشناخته"}
    for code, ids in sorted(((code, [mid for mid, reason in rejected if reason == code]) for code in reasons), key=lambda p: p[0]):
        report.append(f"- `{code}` ({len(ids)}): {descriptions[code]} — " + "، ".join(f"`{mid}`" for mid in ids))
    report.extend(["", "## پرچم‌های حقوقی و امنیتی", "", "منابع تجاری/دارای نشان گردآوری طرف سوم (مانند `Chegg` در پیام `160`، `z_lib` در `273`، فایل فشردهٔ دارای گذرواژه در `222`) تنها به‌شکل فراداده و پیوند پست ثبت شده‌اند؛ حق بازنشر، مشروعیت نسخهٔ فایل و وجود مجوز احراز نشده است. هیچ محتوایی در این برنامه بارگذاری یا دانلود نمی‌شود. فهرست پیام `327` فقط شاهد نام کاربری کانال است، نه مجوز ناشر. عکس‌های رویداد `360`، `366` و `379` می‌توانند اطلاعات تماس/نام اشخاص داشته باشند و عمداً کنار گذاشته شده‌اند.", "", "## تکرارها و روابط",  "", "هر ارسال حتی در صورت تکرار، با `id` اصلی خودش باقی مانده است. نشانهٔ تکرار فقط تطابق نام فایل نرمال‌شده، اندازهٔ ادعایی و پسوند است و اثبات همسانی محتوای دو فایل نیست. حل‌المسائل فقط در چند جفت با عنوان اثر صریحاً مشترک پیوند `solutionFor` می‌گیرد؛ مجاورت پیام‌ها به‌تنهایی دلیل نیست.", "", "تکرارهای احتمالی (ID←شناسهٔ نسخهٔ قبلی): " + ("، ".join(f"`{r['id']}←{r['relations']['duplicateOf']}`" for r in dupes) if dupes else "ندارد") + ".", "", "## حدود استنتاج", "", "`id` و `sourceMessageId` همان شناسهٔ پیام‌اند؛ `sizeBytes` عدد گزارش‌شدهٔ Telegram و `format` پسوند نام فایل است. `course` فقط با تطابق واژهٔ فایل/کپشن، `teacher`/`professor` فقط با نشانهٔ صریح «استاد» یا «دکتر» در کپشن، `language`/`edition` فقط با عبارت‌های صریح، و `author` در نبود شاهد قطعی `null` است. عنوان ناشناخته از همان نام فایل گرفته می‌شود؛ مثلاً پیام `372` تنها نام نویسندگان در نام فایل دارد و هیچ کپشنی برای نسبت‌دادن آن به درس یا استاد پیام‌های بعدی ندارد. در دادهٔ عمومی متن کپشن کامل، شناسه‌های کاربری، آدرس‌های جانبی، نام دانشجویان، متن نمرات یا دادهٔ خام فایل درج نشده است.", ""])
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(report), encoding="utf-8")
    print(f"media={len(messages)} catalog={len(published)} excluded={len(rejected)} duplicates={len(dupes)}; {dict(kinds)}")


if __name__ == "__main__":
    run()
