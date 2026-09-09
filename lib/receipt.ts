import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ReceiptItem } from '@/types';

export function normalizeReceiptItems(items: any[]): ReceiptItem[] {
  return (Array.isArray(items) ? items : []).map((item) => {
    const price = item.product?.price ?? item.price ?? 0;
    const quantity = item.quantity ?? 0;
    const name = item.product?.name ?? item.name ?? 'Unknown product';
    const productId = item.product?.id ?? item.productId;
    const id = item.id ?? productId ?? `${name}-${quantity}-${price}`;

    return {
      id,
      productId,
      name,
      price,
      quantity,
      subtotal: price * quantity,
    };
  });
}

export async function generatePDFReceipt(transaction: any) {
  const items = normalizeReceiptItems(
    Array.isArray(transaction.items) ? transaction.items : JSON.parse(transaction.items || '[]')
  );

  // Get the total amount (handle both total and totalAmount fields)
  const totalAmount = transaction.totalAmount || transaction.total || 0;
  const businessName = transaction.businessName || 'My Business';

  // Create a temporary container for the receipt HTML
  const receiptContainer = document.createElement('div');
  receiptContainer.style.position = 'absolute';
  receiptContainer.style.left = '-9999px';
  receiptContainer.style.width = '800px';
  receiptContainer.style.padding = '20px';
  receiptContainer.style.backgroundColor = 'white';
  receiptContainer.style.fontFamily = 'Arial, sans-serif';

  const receiptDate = new Date(transaction.createdAt).toLocaleString();
  
  receiptContainer.innerHTML = `
    <div style="padding: 40px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 28px; color: #333;">SALES RECEIPT</h1>
        <p style="margin: 10px 0 0 0; color: #666;">${businessName}</p>
      </div>

      <div style="margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">TRANSACTION ID</p>
          <p style="margin: 0; font-weight: bold; font-size: 14px;">${transaction.id}</p>
        </div>
        <div>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">DATE & TIME</p>
          <p style="margin: 0; font-weight: bold; font-size: 14px;">${receiptDate}</p>
        </div>
        <div>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">PAYMENT METHOD</p>
          <p style="margin: 0; font-weight: bold; font-size: 14px; text-transform: capitalize;">${transaction.paymentMethod}</p>
        </div>
        <div>
          <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">STATUS</p>
          <p style="margin: 0; font-weight: bold; font-size: 14px; color: green;">COMPLETED</p>
        </div>
      </div>

      <div style="margin: 30px 0; border: 1px solid #ddd;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
              <th style="padding: 12px; text-align: left; font-weight: bold; font-size: 12px;">PRODUCT</th>
              <th style="padding: 12px; text-align: center; font-weight: bold; font-size: 12px;">QTY</th>
              <th style="padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">PRICE</th>
              <th style="padding: 12px; text-align: right; font-weight: bold; font-size: 12px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-size: 13px;">${item.name || item.product?.name || 'Unknown'}</td>
                <td style="padding: 12px; text-align: center; font-size: 13px;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right; font-size: 13px;">₦${parseFloat(item.price || item.product?.price || 0).toFixed(2)}</td>
                <td style="padding: 12px; text-align: right; font-size: 13px; font-weight: bold;">₦${(parseFloat(item.price || item.product?.price || 0) * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-bottom: 30px; display: flex; justify-content: flex-end;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #333; border-bottom: 1px solid #ddd;">
            <span style="font-weight: bold;">Subtotal:</span>
            <span>₦${totalAmount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #333;">
            <span style="font-weight: bold; font-size: 16px;">TOTAL:</span>
            <span style="font-weight: bold; font-size: 16px; color: #ff6600;">₦${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">Thank you for your purchase!</p>
        <p style="margin: 0; color: #666; font-size: 11px;">Ease for Business - Inventory Management</p>
        <p style="margin: 5px 0 0 0; color: #999; font-size: 10px;">Receipt printed on ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;

  document.body.appendChild(receiptContainer);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(receiptContainer, {
      scale: 2,
      backgroundColor: '#ffffff',
    });

    // Calculate PDF dimensions (A4 size)
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add pages to PDF
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height in mm

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    // Download PDF
    pdf.save(`receipt-${transaction.id}.pdf`);
  } finally {
    document.body.removeChild(receiptContainer);
  }
}
