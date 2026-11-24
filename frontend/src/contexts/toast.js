import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

/** toast.sucesso('...'), toast.erro('...'), toast.info('...') */
export const useToast = () => useContext(ToastContext)
