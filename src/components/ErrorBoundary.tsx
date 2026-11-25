import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Terjadi gangguan pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('App ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center px-6 py-16">
          <div className="max-w-lg w-full bg-white border border-[#DCE8F6] rounded-xl p-8 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-[#5686C5] mb-2">
              NusaKlik.id · Pemulihan Sistem
            </p>
            <h1 className="text-2xl font-bold text-[#244A83] mb-3">
              Terjadi Gangguan Sementara
            </h1>
            <p className="text-sm text-[#292D35]/80 leading-relaxed mb-6">
              Halaman mengalami kendala saat memuat data. Anda dapat memuat ulang halaman atau kembali ke beranda.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-lg bg-[#244A83] text-white text-sm font-medium hover:bg-[#5686C5] transition-colors"
              >
                Muat Ulang
              </button>
              <a
                href="/"
                className="px-5 py-2.5 rounded-lg border border-[#DCE8F6] text-[#244A83] text-sm font-medium hover:bg-[#DCE8F6]/40 transition-colors"
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
