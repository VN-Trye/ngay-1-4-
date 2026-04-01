# ============================================================
#  TEST MESSAGES API - chay trong PowerShell
#  Server: http://localhost:3000
# ============================================================

# ---- CAU HINH: Doi username/password cho dung voi DB cua ban ----
$BASE    = "http://localhost:3000/api/v1"
$USER    = "user1"        # <-- doi thanh username that
$PASS    = "123456"       # <-- doi thanh password that

# ==============================================================
# BUOC 0: DANG NHAP - lay token
# ==============================================================
Write-Host "`n==== BUOC 0: LOGIN ====" -ForegroundColor Cyan
$loginBody = @{ username = $USER; password = $PASS } | ConvertTo-Json
$loginRes  = Invoke-RestMethod -Uri "$BASE/auth/login" `
                               -Method POST `
                               -ContentType "application/json" `
                               -Body $loginBody
$TOKEN = $loginRes
Write-Host "Token: $TOKEN" -ForegroundColor Green

# ==============================================================
# BUOC 1: LAY INFO USER HIEN TAI (de biet MY_ID)
# ==============================================================
Write-Host "`n==== BUOC 1: GET /auth/me (lay MY_ID) ====" -ForegroundColor Cyan
$me = Invoke-RestMethod -Uri "$BASE/auth/me" `
                        -Method GET `
                        -Headers @{ Authorization = "Bearer $TOKEN" }
$MY_ID = $me._id
Write-Host "My ID: $MY_ID" -ForegroundColor Green
Write-Host ($me | ConvertTo-Json)

# ---- Doi TARGET_USER_ID thanh ID user khac trong DB cua ban ----
$TARGET_ID = "PUT_OTHER_USER_ID_HERE"   # <-- THAY BANG ID USER KHAC

# ==============================================================
# ROUTER 1: GET /messages/:userID - Lay tat ca tin nhan voi 1 user
# ==============================================================
Write-Host "`n==== ROUTER 1: GET /messages/:userID ====" -ForegroundColor Yellow

# [PASS] userID hop le
Write-Host "`n[PASS] Lay tin nhan voi userID hop le:" -ForegroundColor Green
try {
    $r1 = Invoke-RestMethod -Uri "$BASE/messages/$TARGET_ID" `
                            -Method GET `
                            -Headers @{ Authorization = "Bearer $TOKEN" }
    Write-Host ("So luong tin nhan: " + $r1.Count)
    $r1 | ConvertTo-Json -Depth 5
} catch { Write-Host "LOI: $_" -ForegroundColor Red }

# [FAIL] userID sai format
Write-Host "`n[FAIL] userID sai format (invalid_id_abc):" -ForegroundColor Red
try {
    Invoke-RestMethod -Uri "$BASE/messages/invalid_id_abc" `
                      -Method GET `
                      -Headers @{ Authorization = "Bearer $TOKEN" }
} catch { Write-Host "Expected 404:" ($_.ErrorDetails.Message) }

# [FAIL] userID format dung nhung khong ton tai trong DB
Write-Host "`n[FAIL] userID khong ton tai (000...001):" -ForegroundColor Red
try {
    Invoke-RestMethod -Uri "$BASE/messages/000000000000000000000001" `
                      -Method GET `
                      -Headers @{ Authorization = "Bearer $TOKEN" }
} catch { Write-Host "Expected 404:" ($_.ErrorDetails.Message) }

# [FAIL] Khong co token
Write-Host "`n[FAIL] Khong co token (chua dang nhap):" -ForegroundColor Red
try {
    Invoke-RestMethod -Uri "$BASE/messages/$TARGET_ID" -Method GET
} catch { Write-Host "Expected 404:" ($_.ErrorDetails.Message) }

# ==============================================================
# ROUTER 2: POST /messages/:userID - Gui tin nhan
# ==============================================================
Write-Host "`n==== ROUTER 2: POST /messages/:userID ====" -ForegroundColor Yellow

# [PASS] Gui tin nhan TEXT
Write-Host "`n[PASS] Gui tin nhan TEXT:" -ForegroundColor Green
try {
    $textBody = @{ text = "Xin chao! Day la tin nhan test tu PowerShell." } | ConvertTo-Json
    $r2 = Invoke-RestMethod -Uri "$BASE/messages/$TARGET_ID" `
                            -Method POST `
                            -Headers @{ Authorization = "Bearer $TOKEN" } `
                            -ContentType "application/json" `
                            -Body $textBody
    $r2 | ConvertTo-Json -Depth 5
} catch { Write-Host "LOI: $_" -ForegroundColor Red }

# [PASS] Gui them tin nhan TEXT thu 2
Write-Host "`n[PASS] Gui tin nhan TEXT thu 2:" -ForegroundColor Green
try {
    $textBody2 = @{ text = "Ban co khoe khong?" } | ConvertTo-Json
    $r2b = Invoke-RestMethod -Uri "$BASE/messages/$TARGET_ID" `
                             -Method POST `
                             -Headers @{ Authorization = "Bearer $TOKEN" } `
                             -ContentType "application/json" `
                             -Body $textBody2
    Write-Host ("type: " + $r2b.messageContent.type + " | text: " + $r2b.messageContent.text)
} catch { Write-Host "LOI: $_" -ForegroundColor Red }

# [FAIL] Noi dung rong (khong co text, khong co file)
Write-Host "`n[FAIL] Noi dung rong:" -ForegroundColor Red
try {
    Invoke-RestMethod -Uri "$BASE/messages/$TARGET_ID" `
                      -Method POST `
                      -Headers @{ Authorization = "Bearer $TOKEN" } `
                      -ContentType "application/json" `
                      -Body "{}"
} catch { Write-Host "Expected 400:" ($_.ErrorDetails.Message) }

# [FAIL] Text chi co khoang trang
Write-Host "`n[FAIL] Text chi co khoang trang:" -ForegroundColor Red
try {
    $spaceBody = @{ text = "     " } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BASE/messages/$TARGET_ID" `
                      -Method POST `
                      -Headers @{ Authorization = "Bearer $TOKEN" } `
                      -ContentType "application/json" `
                      -Body $spaceBody
} catch { Write-Host "Expected 400:" ($_.ErrorDetails.Message) }

# [FAIL] Gui cho chinh minh
Write-Host "`n[FAIL] Gui cho chinh minh (MY_ID = $MY_ID):" -ForegroundColor Red
try {
    $selfBody = @{ text = "Tu gui cho minh" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BASE/messages/$MY_ID" `
                      -Method POST `
                      -Headers @{ Authorization = "Bearer $TOKEN" } `
                      -ContentType "application/json" `
                      -Body $selfBody
} catch { Write-Host "Expected 400:" ($_.ErrorDetails.Message) }

# [FAIL] userID khong ton tai
Write-Host "`n[FAIL] Gui den userID khong ton tai:" -ForegroundColor Red
try {
    $fakeBody = @{ text = "Hello" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BASE/messages/000000000000000000000001" `
                      -Method POST `
                      -Headers @{ Authorization = "Bearer $TOKEN" } `
                      -ContentType "application/json" `
                      -Body $fakeBody
} catch { Write-Host "Expected 404:" ($_.ErrorDetails.Message) }

# ==============================================================
# ROUTER 3: GET /messages/ - Lay tin nhan cuoi cua moi conversation
# ==============================================================
Write-Host "`n==== ROUTER 3: GET /messages/ (danh sach conversation) ====" -ForegroundColor Yellow

# [PASS] Lay danh sach conversation
Write-Host "`n[PASS] Lay danh sach conversation:" -ForegroundColor Green
try {
    $r3 = Invoke-RestMethod -Uri "$BASE/messages" `
                            -Method GET `
                            -Headers @{ Authorization = "Bearer $TOKEN" }
    Write-Host ("So luong conversation: " + $r3.Count)
    foreach ($item in $r3) {
        Write-Host ("  -> User: " + $item.user.username + " | Last msg: " + $item.lastMessage.messageContent.text)
    }
} catch { Write-Host "LOI: $_" -ForegroundColor Red }

# [FAIL] Khong co token
Write-Host "`n[FAIL] Lay conversation khi chua dang nhap:" -ForegroundColor Red
try {
    Invoke-RestMethod -Uri "$BASE/messages" -Method GET
} catch { Write-Host "Expected 404:" ($_.ErrorDetails.Message) }

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  HOAN THANH TEST MESSAGES API" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan
