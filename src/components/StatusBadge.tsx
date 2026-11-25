import { CheckCircle2, Clock, FileCheck2, ShieldAlert, XCircle } from 'lucide-react';
import type { OrderStatus } from '../types/store';

export function StatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'Menunggu Pembayaran':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#DCE8F6] text-[#244A83]">
          <Clock className="w-3.5 h-3.5" />
          <span>Menunggu Pembayaran</span>
        </span>
      );
    case 'Menunggu Verifikasi':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#E9C477]/35 text-[#292D35]">
          <FileCheck2 className="w-3.5 h-3.5 text-[#244A83]" />
          <span>Menunggu Verifikasi</span>
        </span>
      );
    case 'Dibayar':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#244A83] text-[#E9C477]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Dibayar</span>
        </span>
      );
    case 'Selesai':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#244A83] text-white">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#E9C477]" />
          <span>Selesai</span>
        </span>
      );
    case 'Ditolak':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#292D35] text-[#E9C477]">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Ditolak</span>
        </span>
      );
    case 'Dibatalkan':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gray-200 text-[#292D35]">
          <XCircle className="w-3.5 h-3.5" />
          <span>Dibatalkan</span>
        </span>
      );
  }
}
