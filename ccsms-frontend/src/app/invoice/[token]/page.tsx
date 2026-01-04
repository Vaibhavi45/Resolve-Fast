'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { Download, FileText } from 'lucide-react';
import React from 'react';

function InvoicePageContent({ params }: { params: { token: string } }) {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', params.token],
    queryFn: async () => {
      const response = await api.get(`/complaints/invoice/${params.token}/`);
      return response.data;
    },
    retry: false,
  });

  const handleDownloadPDF = () => {
    // Set document title to invoice number for PDF filename
    const originalTitle = document.title;
    document.title = invoice.invoice_number;
    window.print();
    // Restore original title after print dialog
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1da9c3]"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText size={64} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">This invoice link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto mb-4 print:hidden">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-6 py-3 bg-[#1da9c3] text-white rounded-lg hover:bg-[#178a9f] transition-colors font-medium shadow-lg"
        >
          <Download size={20} />
          Download as PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white shadow-xl p-12 print:shadow-none">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
            <p className="text-gray-600">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-[#1da9c3] mb-1">CCSMS</h2>
            <p className="text-sm text-gray-600">Complaint Case Management System</p>
            <p className="text-sm text-gray-600">support@ccsms.com</p>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="text-base font-semibold text-gray-900">{invoice.customer_name}</p>
            <p className="text-sm text-gray-600">{invoice.customer_email}</p>
            {invoice.customer_phone && <p className="text-sm text-gray-600">{invoice.customer_phone}</p>}
            {invoice.location && <p className="text-sm text-gray-600 mt-1">{invoice.location} {invoice.pincode}</p>}
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Invoice Date:</span>
              <p className="text-sm text-gray-900">{new Date(invoice.created_at).toLocaleDateString()}</p>
            </div>
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Complaint ID:</span>
              <p className="text-sm text-gray-900">{invoice.complaint_number}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">Status:</span>
              <p className="text-sm font-semibold text-green-600">{invoice.status}</p>
            </div>
          </div>
        </div>

        {/* Complaint Details Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Description</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Category</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Priority</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-4 px-4 text-sm text-gray-900">{invoice.title}</td>
              <td className="py-4 px-4 text-sm text-gray-900">{invoice.category}</td>
              <td className="py-4 px-4 text-sm text-gray-900">{invoice.priority}</td>
            </tr>
          </tbody>
        </table>

        {/* Description */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Complaint Details</h3>
          <p className="text-sm text-gray-900 leading-relaxed">{invoice.description}</p>
        </div>

        {/* Timeline */}
        {invoice.timeline && invoice.timeline.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Service Timeline</h3>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Activity</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {invoice.timeline.map((activity: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-xs text-gray-600">{new Date(activity.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-sm text-gray-900">{activity.action}</td>
                    <td className="py-2 px-3 text-xs text-gray-600">{activity.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Resolution */}
        {invoice.resolution_notes && (
          <div className="mb-8 bg-green-50 border-l-4 border-green-500 p-4">
            <h3 className="text-xs font-semibold text-green-900 uppercase mb-2">Resolution Summary</h3>
            <p className="text-sm text-green-900 whitespace-pre-wrap mb-2">{invoice.resolution_notes}</p>
            {invoice.resolved_at && (
              <p className="text-xs text-green-700">Resolved on: {new Date(invoice.resolved_at).toLocaleString()}</p>
            )}
            {invoice.assigned_to && (
              <p className="text-xs text-green-700">Handled by: {invoice.assigned_to}</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 mt-12">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Thank you for using our service</p>
            <p className="text-xs text-gray-500">This is a computer-generated invoice and does not require a signature</p>
            <p className="text-xs text-gray-400 mt-2">Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { 
            margin: 0;
            size: A4;
          }
          body { 
            background: white !important;
            margin: 0;
            padding: 0;
          }
          .print\\:hidden { display: none !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-green-50 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .border-green-500 { border-color: #22c55e !important; }
          .border-gray-300 { border-color: #d1d5db !important; }
          .border-gray-100 { border-color: #f3f4f6 !important; }
          .border-b { border-bottom-width: 1px !important; border-bottom-style: solid !important; }
          .border-l-4 { border-left-width: 4px !important; border-left-style: solid !important; }
          .border-t-2 { border-top-width: 2px !important; border-top-style: solid !important; }
          .shadow-xl { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = React.use(params);
  return <InvoicePageContent params={resolvedParams} />;
}
