/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hero } from '@/components/Hero';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-white font-sans text-wandor-text antialiased selection:bg-wandor-prompt selection:text-white">
      <Hero />
    </div>
  );
}

