'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { IconButton } from '../buttons/IconButton';
import { Input, type InputProps } from './Input';

export type PasswordInputProps = Omit<InputProps, 'type' | 'endAdornment' | 'rightIcon'>;

/**
 * Campo de contraseña con botón mostrar/ocultar (decisión de registro del
 * Director, 2026-10-22: una sola contraseña, sin campo de confirmación).
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete ?? 'current-password'}
      endAdornment={
        <IconButton
          variant="ghost"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </IconButton>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
