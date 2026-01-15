import React from 'react';
import classNames from 'classnames';
import './styles.less';

export type ButtonType = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonShape = 'default' | 'circle' | 'round';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type?: ButtonType;
  size?: ButtonSize;
  shape?: ButtonShape;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  ghost?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  size = 'medium',
  shape = 'default',
  disabled = false,
  loading = false,
  block = false,
  ghost = false,
  danger = false,
  icon,
  children,
  className,
  onClick,
  ...restProps
}) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const classes = classNames(
    'un-btn',
    `un-btn-${type}`,
    `un-btn-${size}`,
    `un-btn-${shape}`,
    {
      'un-btn-block': block,
      'un-btn-ghost': ghost,
      'un-btn-danger': danger,
      'un-btn-loading': loading,
      'un-btn-disabled': disabled,
      'un-btn-icon-only': !children && icon,
    },
    className
  );

  const iconNode = loading ? (
    <span className="un-btn-loading-icon" />
  ) : (
    icon && <span className="un-btn-icon">{icon}</span>
  );

  return (
    <button className={classes} disabled={disabled || loading} onClick={handleClick} {...restProps}>
      {iconNode}
      {children && <span className="un-btn-content">{children}</span>}
    </button>
  );
};

export default Button;
