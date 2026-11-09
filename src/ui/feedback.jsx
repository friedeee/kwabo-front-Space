import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from './Icon.jsx';

const FeedbackContext = createContext(null);
export const useFeedback = () => useContext(FeedbackContext);

/*
 * Messages éphémères et fenêtres (élément <dialog> natif : le clavier reste dedans, Échap ferme).
 * Jamais de fenêtre native du navigateur pour confirmer.
 */
export function FeedbackProvider({ children }) {
    const [message, setMessage] = useState(null);
    const [dialog, setDialog] = useState(null);
    const dialogRef = useRef(null);
    const timer = useRef(null);
    const resolver = useRef(null);

    const toast = useCallback((text) => {
        setMessage({ text, id: Date.now() });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setMessage(null), 3200);
    }, []);

    const close = useCallback(() => {
        resolver.current?.(false);
        resolver.current = null;
        setDialog(null);
    }, []);

    const open = useCallback((content, options = {}) => setDialog({ content, ...options, key: Date.now() }), []);

    const confirm = useCallback(({ title, body = '', confirm: label = 'Confirmer', danger = false }) => new Promise((resolve) => {
        resolver.current = resolve;
        const answer = (value) => { resolver.current = null; setDialog(null); resolve(value); };
        setDialog({
            key: Date.now(),
            content: (
                <>
                    <h2 className="dialog-title" id="dialog-heading">{title}</h2>
                    {body && <p className="muted">{body}</p>}
                    <div className="dialog-actions">
                        <button className="btn btn-ghost" type="button" onClick={() => answer(false)}>Annuler</button>
                        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} type="button" data-autofocus onClick={() => answer(true)}>{label}</button>
                    </div>
                </>
            ),
        });
    }), []);

    useEffect(() => {
        const element = dialogRef.current;
        if (!element) return;
        if (dialog && !element.open) element.showModal();
        if (!dialog && element.open) element.close();
        if (dialog) {
            const target = element.querySelector('[data-autofocus]') ?? element.querySelector('#dialog-body input:not([type="radio"]), #dialog-body select, #dialog-body textarea, #dialog-body button');
            target?.focus();
        }
    }, [dialog]);

    const value = useMemo(() => ({ toast, open, close, confirm }), [toast, open, close, confirm]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            <dialog
                id="dialog"
                ref={dialogRef}
                className={dialog?.wide ? 'dialog-wide' : ''}
                aria-labelledby="dialog-heading"
                onCancel={(event) => { event.preventDefault(); close(); }}
                onClick={(event) => { if (event.target === dialogRef.current) close(); }}
            >
                <button className="dialog-close" type="button" onClick={close} aria-label="Fermer"><Icon name="x-mark" size={22} /></button>
                <motion.div id="dialog-body" key={dialog?.key} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }}>
                    {dialog?.content}
                </motion.div>
            </dialog>
            <div className="toast-host" role="status" aria-live="polite">
                <AnimatePresence>
                    {message && (
                        <motion.div key={message.id} className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </FeedbackContext.Provider>
    );
}
