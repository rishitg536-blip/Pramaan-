import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Pramaan Loading Screen Component & Integration', () => {
  const loadingScreenFile = path.resolve(__dirname, '../src/ui/components/LoadingScreen.tsx');
  const mainFile = path.resolve(__dirname, '../src/main.tsx');
  const logoPath = path.resolve(__dirname, '../public/branding/Pramaan_logo.png');

  it('ensures official Pramaan logo asset exists in public/branding/Pramaan_logo.png', () => {
    expect(fs.existsSync(logoPath)).toBe(true);
    const stats = fs.statSync(logoPath);
    expect(stats.size).toBeGreaterThan(1000);
  });

  it('verifies LoadingScreen uses the exact approved wording', () => {
    const content = fs.readFileSync(loadingScreenFile, 'utf8');

    // Required wording checks
    expect(content).toContain('/branding/Pramaan_logo.png');
    expect(content).toContain('PRIVATE • CHECKABLE • ORGANIZED');
    expect(content).toContain('LOADING PRAMAAN');
    expect(content).toContain('TAP OR ESC TO SKIP');
  });

  it('verifies skip interactions (Escape key and skip button)', () => {
    const content = fs.readFileSync(loadingScreenFile, 'utf8');

    // Keydown Escape event listener
    expect(content).toContain("e.key === 'Escape'");
    expect(content).toContain('triggerExit()');

    // Click and keyboard interaction on the button
    expect(content).toContain('handleSkipClick');
    expect(content).toContain("e.key === 'Enter'");
    expect(content).toContain("e.key === ' '");
  });

  it('verifies vertical reveal/tear-like exit transition and prefers-reduced-motion support', () => {
    const content = fs.readFileSync(loadingScreenFile, 'utf8');

    // Vertical reveal transition
    expect(content).toContain('-translate-y-full');

    // prefers-reduced-motion media query handling
    expect(content).toContain('(prefers-reduced-motion: reduce)');
    expect(content).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('verifies MainWorkspace renders LoadingScreen as an overlay without changing existing app structure', () => {
    const mainContent = fs.readFileSync(mainFile, 'utf8');

    expect(mainContent).toContain('<LoadingScreen');
    expect(mainContent).toContain('showLoadingOverlay');
    expect(mainContent).toContain('isReady={!isLoading && !!meta}');
    expect(mainContent).toContain('onFinish={handleFinishLoading}');

    // Ensure core sections are intact
    expect(mainContent).toContain('<GitTicker');
    expect(mainContent).toContain('<S0Hero');
    expect(mainContent).toContain('<CaseIntakeScreen');
    expect(mainContent).toContain('<S2Evidence');
    expect(mainContent).toContain('<TimelineSection');
    expect(mainContent).toContain('<S3Custody');
    expect(mainContent).toContain('<S4Seal');
    expect(mainContent).toContain('<S5Footer');
  });

  it('verifies CaseIntakeScreen blocks progression when mandatory details are missing', () => {
    const intakeContent = fs.readFileSync(
      path.resolve(__dirname, '../src/ui/sections/CaseIntakeScreen.tsx'),
      'utf8'
    );

    expect(intakeContent).toContain('validate = () =>');
    expect(intakeContent).toContain('!name.trim()');
    expect(intakeContent).toContain('!parentage.trim()');
    expect(intakeContent).toContain('!address.trim()');
    expect(intakeContent).toContain('!title.trim()');
    expect(intakeContent).toContain('!makeModel.trim()');
    expect(intakeContent).toContain('ALL CASE DETAILS ARE MANDATORY:');
  });
});

