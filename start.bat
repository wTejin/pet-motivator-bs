@echo off
echo ========================================
echo  pet-motivator-bs 一键启动
echo  (使用 Node.js, 不使用 Bun)
echo ========================================

echo.
echo [1/2] 启动后端 (Express :3000)...
start "pet-motivator-server" cmd /k "cd /d D:\claudeCode\pet-motivator-bs\server && npx tsx src/index.ts"

echo [2/2] 启动前端 (Vite :5173)...
start "pet-motivator-client" cmd /k "cd /d D:\claudeCode\pet-motivator-bs\client && npm run dev"

echo.
echo 等待服务就绪...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo  启动完成！
echo  前端入口: http://localhost:5173
echo  管理端:   http://localhost:5173/#/admin/login
echo  账号: admin / admin123
echo ========================================
pause
