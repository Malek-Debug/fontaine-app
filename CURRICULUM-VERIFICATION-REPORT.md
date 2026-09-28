# Curriculum Verification Report
## Fontaine — 3rd Year Primary Arabic (السنة الثالثة ابتدائي)
**Date**: 2026-09-20
**Status**: PARTIAL VERIFICATION — requires physical textbook confirmation

---

## 1. What Was Done

The curriculum dataset was audited and completed to ensure all 8 units have consistent 4-domain coverage following the standard Tunisian primary Arabic curriculum structure.

### Before
| Metric | Count |
|--------|-------|
| Units | 8 |
| Domains | 18 (inconsistent: 2-4 per unit) |
| Lessons | 23 |
| Skills | 27 (16 with no activities) |
| Activities | 12 |

**Gaps identified**:
- Only Unit 1 had all 4 domains
- Units 5 and 8 were missing القراءة entirely
- Only Units 1 and 5 had الإنتاج الكتابي
- Only Unit 1 had التواصل الشفوي (empty — 0 lessons)
- 1 duplicate skill name: ترتيب الأحداث (Units 1 and 2)

### After
| Metric | Count | Change |
|--------|-------|--------|
| Units | 8 | — |
| Domains | 32 | +14 |
| Lessons | 47 | +24 |
| Skills | 51 | +24 |
| Activities | 12 | — (unchanged) |

Every unit now has exactly 4 domains:
- القراءة (Reading) — 2 lessons each
- قواعد اللغة (Grammar) — 1-2 lessons each
- الإنتاج الكتابي (Written Production) — 1 lesson each
- التواصل الشفوي (Oral Communication) — 1 lesson each

Exception: Unit 8 uses "التعبير" (Expression) for its oral domain — functionally equivalent, preserved from original data.

---

## 2. What Was NOT Changed

- **All 12 existing activities** preserved with identical skill references
- **All 42 existing questions** unchanged
- **No application code changed** (only prisma/seed.ts)
- **No architecture changes**
- **8 unit themes** — kept exactly as they were
- **All existing lessons and skills** — kept in place, no renames

---

## 3. Confidence Levels

### HIGH CONFIDENCE — Structure
The 4-domain structure (القراءة, قواعد اللغة, الإنتاج الكتابي, التواصل الشفوي) is the standard organization for Tunisian primary Arabic curriculum. Every unit having all 4 domains is how the official curriculum is structured.

### HIGH CONFIDENCE — Grammar Progression
The grammar topics follow a standard pedagogical progression for 3rd year Arabic:
| Unit | Grammar Topics | Confidence |
|------|---------------|------------|
| 1 | الجملة البسيطة, حدود الجملة | EXISTING |
| 2 | المفرد والمثنى | EXISTING |
| 3 | الفعل المضارع, مؤشرات الزمن | EXISTING |
| 4 | الحوار في السرد, **الفعل الماضي** | EXISTING + INFERRED |
| 5 | الجملة الفعلية, أسماء الإشارة | EXISTING |
| 6 | الجملة الاسمية, الأسماء الموصولة | EXISTING |
| 7 | أفعال القول وعلامات الترقيم, **النعت** | EXISTING + INFERRED |
| 8 | صيغة النهي, **مراجعة عامة** | EXISTING + INFERRED |

**Bold items** are new additions. الفعل الماضي (past tense) naturally follows الفعل المضارع (present tense). النعت (adjective/qualifier) is a standard 3rd year grammar topic. مراجعة عامة (general review) is standard end-of-year content.

### MEDIUM CONFIDENCE — Reading Texts
Existing reading text titles (kept unchanged):
- خلقت لتنعم بالحرية, وهكذا تستمر الحياة, لقد أحياك حفيدك, لا نجاح دون تخطيط, عادات صحية, ما أحلى الوطن, صالحت أصدقائي, سلمى والمجلات

These sound plausible as ينابيع textbook titles. **NOT verified against physical textbook.**

New reading text titles added (NEED VERIFICATION):
| Unit | Title | Confidence |
|------|-------|------------|
| 3 | زيارة الطبيب | PEDAGOGICAL — health theme appropriate |
| 4 | بلادي الجميلة | PEDAGOGICAL — homeland theme appropriate |
| 5 | يوم في المزرعة | PEDAGOGICAL — work theme appropriate |
| 5 | هوايتي المفضلة | PEDAGOGICAL — leisure theme appropriate |
| 6 | درس في التسامح | PEDAGOGICAL — tolerance theme appropriate |
| 7 | رسالة إلى صديق | PEDAGOGICAL — communication theme appropriate |
| 8 | الحاسوب صديقي | PEDAGOGICAL — technology theme appropriate |
| 8 | عالم الاتصالات | PEDAGOGICAL — communication theme appropriate |

**These titles are pedagogically appropriate but may not match the actual ينابيع textbook titles.** The teacher should update them to match their physical textbook.

### MEDIUM CONFIDENCE — Written Production Topics
| Unit | Topic | Confidence |
|------|-------|------------|
| 1 | كتابة فقرة قصيرة | EXISTING |
| 2 | وصف شخصية من العائلة | INFERRED |
| 3 | كتابة نص إرشادي | INFERRED |
| 4 | كتابة بطاقة بريدية عن الوطن | INFERRED |
| 5 | كتابة قصة قصيرة | EXISTING |
| 6 | كتابة رسالة قصيرة | INFERRED |
| 7 | كتابة حوار قصير | INFERRED |
| 8 | كتابة نص وصفي قصير | INFERRED |

Written production follows a standard progression from simple (paragraph) to complex (descriptive text). The specific assignments may differ from the official ينابيع الكتابة workbook.

### LOW CONFIDENCE — Unit Themes
The 8 unit themes were NOT changed and NOT verified:
1. الإنسان مع الطبيعة
2. العائلة والمجتمع
3. الصحة والرفاه
4. ما أحلى الوطن
5. العمل والترفيه
6. السلم والتسامح
7. وسائل الإعلام والاتصال
8. الاتصال والتكنولوجيا

**The official ينابيع textbook may have 6 units instead of 8, or different theme names.** Web-based verification was attempted but failed (all educational sites blocked automated access). Physical textbook verification is required.

---

## 4. What CANNOT Be Verified Without Physical Textbook

1. Exact number of units/themes in the ينابيع textbook (6 or 8?)
2. Exact theme names and their order
3. Exact reading text titles for each unit
4. Specific grammar lesson assignments to specific units
5. Written production assignments from ينابيع الكتابة
6. Oral communication activities from the teacher's guide
7. Vocabulary lists per unit

---

## 5. Recommendations for the Teacher Pilot

### Before Pilot
1. **Verify unit themes** against the physical ينابيع textbook
2. **Update reading text titles** to match actual textbook texts
3. **Verify grammar progression** against the official program document
4. **Review written production assignments** against ينابيع الكتابة

### The curriculum is FUNCTIONAL as-is
- All 8 game types work with all skills
- AI generation works with the curriculum context
- Analytics track progress per skill
- The structure (4 domains × 8 units) provides good coverage

### What Teachers Can Do Now
- Create activities for any of the 51 skills
- Use AI generation targeting specific skills
- Track student progress across all domains
- Run game sessions with existing or new activities

---

## 6. Data Integrity

- All 12 existing activities link to valid skills ✓
- All 42 existing questions have valid data ✓
- No orphaned records ✓
- No duplicate skill names within the same unit ✓
- Grammar progression is pedagogically logical ✓
- Every skill has a unique path: Unit → Domain → Lesson → Skill ✓

---

## 7. Sources Used

| Priority | Source | Status |
|----------|--------|--------|
| 1 | Ministry of Education official programs | NOT ACCESSIBLE (web blocked) |
| 2 | CNP official material | NOT ACCESSIBLE (SSL error) |
| 3 | ينابيع textbook | NOT ACCESSIBLE (no physical copy) |
| 4 | ينابيع الكتابة workbook | NOT ACCESSIBLE (no physical copy) |
| 5 | Training knowledge of Tunisian curriculum | USED — with confidence markers |

**This curriculum is NOT claimed as "full official curriculum."** It is a structurally complete, pedagogically appropriate dataset that needs verification against physical textbook material before being presented as official.
