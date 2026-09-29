'use client';

import { AddressManager } from '@/components/account/address-manager';

export default function AddressesPage() {
  return (
    <div className="container-page max-w-3xl space-y-4 py-8">
      <h1 className="text-2xl font-extrabold">Saved addresses</h1>
      <AddressManager />
    </div>
  );
}
