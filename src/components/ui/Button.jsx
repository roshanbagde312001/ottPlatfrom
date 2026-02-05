import { forwardRef } from 'react'
import { FiLoader } from 'react-icons/fi'

// Button Component
export const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  ...props
}, ref) => {
  // Base styles
  const baseStyles = `
    inline-flex items-center justify-center font-semibold rounded-md
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
    disabled:opacity-50 disabled:cursor-not-allowed
    transform active:scale-95
  `
  
  // Variant styles
  const variants = {
    primary: 'bg-netflix-red text-white hover:bg-red-700 focus:ring-red-500 shadow-lg hover:shadow-red-500/25',
    secondary: 'bg-gray-600 text-white hover:bg-gray-500 focus:ring-gray-500',
    outline: 'border-2 border-white text-white hover:bg-white hover:text-black focus:ring-white',
    ghost: 'text-white hover:bg-gray-800 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  }
  
  // Size styles
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-base gap-2',
    lg: 'px-7 py-3.5 text-lg gap-2.5',
    xl: 'px-8 py-4 text-xl gap-3',
  }
  
  // Width style
  const widthStyle = fullWidth ? 'w-full' : ''

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${widthStyle}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <FiLoader className="animate-spin" size={size === 'sm' ? 16 : 20} />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button

