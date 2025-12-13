import React from 'react';

/**
 * React components library
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    size?: 'small' | 'medium' | 'large';
}
declare const Button: React.FC<ButtonProps>;

export { Button, type ButtonProps };
