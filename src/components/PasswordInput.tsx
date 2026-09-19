import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = InputHTMLAttributes<HTMLInputElement>;

/**
 * A password field with an eye toggle.
 *
 * Replaces the `<input>` only — no label or wrapper opinions — so a caller's
 * existing field structure and classes carry over untouched. `type` is applied
 * after the spread so it cannot be overridden away.
 */
export default function PasswordInput(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        // pr-10 leaves room for the icon inside the field. Tailwind emits pr-*
        // after p-*, so this still wins on a caller that sets padding with p-2.
        className={`${props.className ?? ''} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={visible ? 'Hide password' : 'Show password'}
        // Kept out of the tab sequence so Tab runs straight from the password
        // field to the next one, rather than stopping on the eye.
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
