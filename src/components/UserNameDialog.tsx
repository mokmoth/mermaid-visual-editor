import { useState, useCallback, memo } from 'react'
import { userExists, registerUser, loginUser } from '@/services/storage'

interface UserNameDialogProps {
  onConfirm: (username: string) => void
  initialMode?: 'login' | 'register'
}

export const UserNameDialog = memo(({ onConfirm, initialMode }: UserNameDialogProps) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'check' | 'login' | 'register'>(initialMode || 'check')
  const [showPassword, setShowPassword] = useState(false)

  const handleUsernameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmed = username.trim()
    
    // Validate username
    if (!trimmed) {
      setError('请输入用户名')
      return
    }
    
    if (trimmed.length < 2) {
      setError('用户名至少需要 2 个字符')
      return
    }
    
    if (trimmed.length > 20) {
      setError('用户名不能超过 20 个字符')
      return
    }
    
    // Only allow alphanumeric, Chinese characters, underscore and hyphen
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('用户名只能包含中文、字母、数字、下划线和横线')
      return
    }
    
    // Check if user exists
    if (userExists(trimmed)) {
      setMode('login')
      setError('')
    } else {
      setMode('register')
      setError('')
    }
  }, [username])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password) {
      setError('请输入密码')
      return
    }
    
    const result = await loginUser(username.trim(), password)
    if (result.success) {
      onConfirm(username.trim())
    } else {
      setError(result.error || '登录失败')
    }
  }, [username, password, onConfirm])

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password) {
      setError('请输入密码')
      return
    }
    
    if (password.length < 4) {
      setError('密码至少需要 4 个字符')
      return
    }
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    
    const result = await registerUser(username.trim(), password)
    if (result.success) {
      onConfirm(username.trim())
    } else {
      setError(result.error || '注册失败')
    }
  }, [username, password, confirmPassword, onConfirm])

  const handleBack = useCallback(() => {
    setMode('check')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }, [])

  const handleInputChange = useCallback((setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    setError('')
  }, [])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 sm:py-8 text-white">
          <div className="flex items-center justify-center mb-4">
            <svg 
              className="w-12 h-12 sm:w-16 sm:h-16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-center">
            {mode === 'check' ? '欢迎使用 Mermaid 编辑器' : 
             mode === 'login' ? '欢迎回来' : '创建新账号'}
          </h1>
          <p className="text-blue-100 text-center mt-2 text-sm">
            {mode === 'check' ? '可视化编辑各类图表，让复杂逻辑一目了然' :
             mode === 'login' ? `用户名：${username}` : `新用户：${username}`}
          </p>
        </div>

        {/* Form - Check Username */}
        {mode === 'check' && (
          <form onSubmit={handleUsernameSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                请输入您的用户名
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={handleInputChange(setUsername)}
                placeholder="例如：张三、alice、user_01"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error 
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400' 
                    : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'
                }`}
                autoFocus
                autoComplete="off"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                新用户将自动创建账号，老用户需要输入密码登录
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
            >
              继续
            </button>
          </form>
        )}

        {/* Form - Login */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="p-6">
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                请输入密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                  placeholder="输入您的密码"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    error 
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-400' 
                      : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'
                  }`}
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
              >
                返回
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
              >
                登录
              </button>
            </div>
          </form>
        )}

        {/* Form - Register */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="p-6">
            <div className="mb-4">
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                设置密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                  placeholder="至少 4 个字符"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    error && error.includes('密码')
                      ? 'border-red-300 focus:ring-red-200 focus:border-red-400' 
                      : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'
                  }`}
                  autoFocus
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirm-password"
                value={confirmPassword}
                onChange={handleInputChange(setConfirmPassword)}
                placeholder="再次输入密码"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error && error.includes('不一致')
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400' 
                    : 'border-gray-300 focus:ring-blue-200 focus:border-blue-400'
                }`}
                autoComplete="new-password"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
              >
                返回
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all shadow-lg hover:shadow-xl"
              >
                创建账号
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 pt-0">
          <p className="text-xs text-gray-400 text-center">
            {mode === 'check' 
              ? '您的数据将保存在本地浏览器中，更换浏览器需要重新注册'
              : mode === 'login'
              ? '忘记密码？请联系管理员'
              : '请牢记您的密码，密码无法找回'}
          </p>
        </div>
      </div>
    </div>
  )
})

UserNameDialog.displayName = 'UserNameDialog'
