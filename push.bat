@echo off
chcp 65001 > nul
echo ========================================================
echo    🚀 ShiftFlow • อัปโหลดโค้ดขึ้น GitHub อัตโนมัติ
echo ========================================================
echo.

where git >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] ตรวจพบ Git ในเครื่อง กำลังประมวลผล...
    git add .
    git commit -m "Auto update: %date% %time%"
    git branch -M main
    git push -u origin main
    if %errorlevel% equ 0 (
        echo.
        echo ========================================================
        echo  🎉 สำเร็จ! อัปโหลดโค้ดขึ้น GitHub เรียบร้อยแล้ว
        echo ========================================================
        pause
        exit /b 0
    )
)

echo [*] รันตัวช่วยอัปโหลดโค้ดผ่าน Node.js...
node scripts/push.js %*

echo.
pause
