import { ButtonHTMLAttributes, FC } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

const Button: FC<Props> = ({ className = '', ...props }) => {
  return <button className={className} {...props} />;
};

export default Button;

