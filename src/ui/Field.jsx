import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../api/db.js';
import { Icon } from './Icon.jsx';

/*
 * Champ accessible : libellé, aide, erreur liée au champ.
 * Les formulaires restent non contrôlés : on lit les valeurs avec FormData à l'envoi.
 */
export function Field({ name, label, type = 'text', required = false, defaultValue, placeholder, hint, options, autoComplete, rows, accept, optionalMark = true, error, placeholderOption = 'Sélectionnez…', ...rest }) {
    const id = `f-${name}`;
    const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
    const common = { id, name, required, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, autoComplete, ...rest };
    let control;
    if (type === 'select') {
        control = (
            <select {...common} defaultValue={defaultValue ?? ''}>
                {placeholderOption !== false && <option value="">{placeholderOption}</option>}
                {options.map((option) => {
                    const value = typeof option === 'object' ? option.value : option;
                    return <option key={value} value={value}>{typeof option === 'object' ? option.label : option}</option>;
                })}
            </select>
        );
    } else if (type === 'textarea') {
        control = <textarea {...common} rows={rows ?? 4} placeholder={placeholder} defaultValue={defaultValue} />;
    } else if (type === 'password') {
        control = <PasswordInput {...common} placeholder={placeholder} />;
    } else if (type === 'file') {
        control = <input {...common} type="file" accept={accept} />;
    } else {
        control = <input {...common} type={type} placeholder={placeholder} defaultValue={defaultValue} />;
    }
    return (
        <div className="field">
            <label htmlFor={id}>{label}{!required && optionalMark && <span className="optional"> (facultatif)</span>}</label>
            {control}
            {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
            {error && <p className="error" id={`${id}-error`}>{error}</p>}
        </div>
    );
}

/* L'œil est barré quand le mot de passe est caché, ouvert quand il est visible. */
export function PasswordInput(props) {
    const [visible, setVisible] = useState(false);
    const input = useRef(null);
    const label = visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
    return (
        <span className="input-with-button">
            <input {...props} ref={input} type={visible ? 'text' : 'password'} />
            <button
                className="eye"
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={visible}
                onClick={() => {
                    setVisible(!visible);
                    requestAnimationFrame(() => {
                        input.current.focus();
                        const end = input.current.value.length;
                        input.current.setSelectionRange(end, end);
                    });
                }}
            >
                <Icon name={visible ? 'eye' : 'eye-slash'} />
            </button>
        </span>
    );
}

/* Erreurs d'un formulaire : affiche, puis place le curseur sur le premier champ fautif. */
export function useFormErrors() {
    const [errors, setErrorsState] = useState({});
    const formRef = useRef(null);
    const setErrors = useCallback((next) => {
        setErrorsState(next);
        requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
        return Object.keys(next).length === 0;
    }, []);
    const fromApi = useCallback((error, fallback = '_') => {
        if (!(error instanceof ApiError)) throw error;
        setErrors({ [error.field ?? fallback]: error.message });
    }, [setErrors]);
    return { errors, setErrors, fromApi, formRef };
}

export function FormError({ message }) {
    if (!message) return null;
    return <p className="form-error" role="alert">{message}</p>;
}

export const formValues = (form) => Object.fromEntries(new FormData(form));
