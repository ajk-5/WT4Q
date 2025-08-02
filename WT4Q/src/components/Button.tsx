import { ButtonHTMLAttributes, FC } from 'react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

const Button: FC<Props> = ({ className = '', ...props }) => {
  return <button className={`${styles.button} ${className}`.trim()} {...props} />;
};

export default Button;

