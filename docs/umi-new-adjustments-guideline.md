# Umi Guideline — New Adjustment

## 1. Password Policy

Semasa create/update account, password mesti ikut policy:

- Minimum 8 characters
- Ada huruf besar
- Ada huruf kecil
- Ada nombor
- Ada special character

Example valid:

```txt
Student@123
Unikl@2026
Admin@1234
```

Example invalid:

```txt
12345678
password
admin123
```

---

## 2. Refresh Page Clears Login Form

Untuk security/privacy:

- Bila user isi Staff ID / Student ID dan password
- Kemudian refresh page
- Field ID dan password akan kosong semula

Tujuan:

```txt
Elak ID/password tertinggal dalam browser selepas refresh.
```

---

## 3. Student ID Format

Student ID mesti ikut format UniKL:

```txt
522XXXXXXX
```

Rules:

| Rule | Example |
|---|---|
| 10 digits total | `5221234567` |
| Must start with `522` | ✅ `5227654321` |
| Number only | No letters/symbols |

Invalid examples:

```txt
1234567890
522123
ABC5221234
522-1234567
```

---

## 4. Staff ID Format

Staff ID untuk:

- Supervisor
- Assessor
- Coordinator

Mesti ikut UniKL staff format yang system validate.

Umi perlu masukkan Staff ID sebenar, bukan nama/random short ID.

Invalid examples:

```txt
abc
123
staff01
```

---

## 5. Supervisor View

Supervisor boleh tengok:

- Semua student bawah supervision dia
- Project title
- Student info
- Assessment status
- Total marks student bawah dia

---

## 6. Assessor View

Assessor boleh tengok:

- Semua student/project assigned kepada dia
- Rubric/assessment marks
- Total marks untuk student yang dia assess

---

## 7. Coordinator View

Coordinator boleh tengok:

- Semua students
- Supervisor assignment
- Assessor assignment
- Total marks semua students
- Published/unpublished result status

---

## 8. Important Notes

| Problem | What to check |
|---|---|
| Cannot register student | Student ID must be 10 digits and start with `522` |
| Cannot create staff | Staff ID format must follow UniKL format |
| Password rejected | Use strong password format |
| Marks not visible | Make sure supervisor/assessor already assigned |
| Student cannot see result | Coordinator must publish result first |
