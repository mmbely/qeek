declare module 'react-responsive-modal' {
    import { ReactNode } from 'react';
  
    export interface ModalProps {
      open: boolean;
      onClose: () => void;
      center?: boolean;
      closeOnEsc?: boolean;
      closeOnOverlayClick?: boolean;
      classNames?: {
        overlay?: string;
        modal?: string;
        modalAnimationIn?: string;
        modalAnimationOut?: string;
        overlayAnimationIn?: string;
        overlayAnimationOut?: string;
      };
      children?: ReactNode;
      showCloseIcon?: boolean;
      closeIcon?: ReactNode;
      styles?: {
        overlay?: React.CSSProperties;
        modal?: React.CSSProperties;
        closeButton?: React.CSSProperties;
        closeIcon?: React.CSSProperties;
      };
      animationDuration?: number;
      blockScroll?: boolean;
    }
  
    export class Modal extends React.Component<ModalProps> {}
  }