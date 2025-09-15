/**
 * Componente global para manejo de errores no capturados
 * Mejora la robustez de toda la aplicación
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import { ErrorHandler } from '@/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class GlobalErrorHandler extends Component<Props, State> {
  private errorHandler: ErrorHandler;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
    this.errorHandler = ErrorHandler.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Procesar error con el handler centralizado
    const appError = this.errorHandler.processError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'GlobalErrorHandler',
      errorId: this.state.errorId
    });

    this.setState({
      error,
      errorInfo
    });

    // En producción, enviar a servicio de reporte de errores
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(appError, errorInfo);
    }
  }

  private reportErrorToService = async (appError: any, errorInfo: ErrorInfo) => {
    try {
      // Aquí se enviaría a un servicio como Sentry, LogRocket, etc.
      const errorReport = {
        ...appError,
        stackTrace: this.state.error?.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      console.log('Error report (would be sent to service):', errorReport);

      // Ejemplo de envío a servicio externo:
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
    } catch (reportError) {
      console.error('Failed to report error to service:', reportError);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReportError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      url: window.location.href
    };

    const emailBody = `
Reporte de Error - Gooms Inventory

ID del Error: ${errorDetails.errorId}
URL: ${errorDetails.url}
Mensaje: ${errorDetails.message}

Detalles adicionales:
${JSON.stringify(errorDetails, null, 2)}

---
Este reporte fue generado automáticamente.
    `.trim();

    const mailtoLink = `mailto:soporte@gooms.com?subject=Error Report - ${errorDetails.errorId}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink);
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';
      const showDetails = this.props.showDetails ?? isDevelopment;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Icon y header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  ¡Ups! Algo no salió como esperado
                </h1>
                <p className="text-gray-600 text-lg">
                  Ha ocurrido un error inesperado en la aplicación
                </p>
                {this.state.errorId && (
                  <p className="text-sm text-gray-500 mt-2">
                    ID del error: <code className="bg-gray-100 px-2 py-1 rounded">{this.state.errorId}</code>
                  </p>
                )}
              </div>

              {/* Información del error (solo en desarrollo o si se solicita) */}
              {showDetails && this.state.error && (
                <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    Detalles del Error
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Mensaje:</h4>
                      <p className="text-sm font-mono text-red-700 bg-red-100 p-3 rounded border">
                        {this.state.error.message}
                      </p>
                    </div>

                    {this.state.error.stack && (
                      <div>
                        <h4 className="font-medium text-red-800 mb-2">Stack Trace:</h4>
                        <pre className="text-xs font-mono text-red-700 bg-red-100 p-3 rounded border max-h-48 overflow-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <h4 className="font-medium text-red-800 mb-2">Component Stack:</h4>
                        <pre className="text-xs font-mono text-red-700 bg-red-100 p-3 rounded border max-h-32 overflow-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sugerencias de solución */}
              <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  ¿Qué puedes hacer?
                </h3>
                <ul className="space-y-2 text-blue-800">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <span>Intenta recargar la página</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <span>Verifica tu conexión a internet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <span>Regresa al inicio y vuelve a intentar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <span>Si el problema persiste, repórtalo al equipo de soporte</span>
                  </li>
                </ul>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={this.handleReload}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Recargar Página
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Home className="w-5 h-5" />
                    Ir al Inicio
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Intentar de Nuevo
                  </button>

                  <button
                    onClick={this.handleReportError}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Reportar Error
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                  Si necesitas ayuda inmediata, contacta a soporte técnico en{' '}
                  <a href="mailto:soporte@gooms.com" className="text-blue-600 hover:underline">
                    soporte@gooms.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper más simple para errores específicos de componentes
 */
export const ComponentErrorBoundary: React.FC<{
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
}> = ({ children, componentName, fallback }) => {
  return (
    <GlobalErrorHandler
      fallback={
        fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Error en {componentName}</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Este componente no pudo cargar correctamente.
            </p>
          </div>
        )
      }
    >
      {children}
    </GlobalErrorHandler>
  );
};