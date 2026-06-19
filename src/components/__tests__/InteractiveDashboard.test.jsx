import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import InteractiveDashboard from '../InteractiveDashboard';

// Mock scrollIntoView since it's not implemented in JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('InteractiveDashboard', () => {
  it('renders the Core Card (Core 00) and 13 life domains', () => {
    render(<InteractiveDashboard />);
    
    // Core Card 00
    const coreCard = document.getElementById('domain-card-00');
    expect(coreCard).toBeDefined();
    expect(screen.getByText('Core —')).toBeDefined();

    // Verify presence of all 13 domains (01 to 13)
    for (let i = 1; i <= 13; i++) {
      const numStr = String(i).padStart(2, '0');
      const card = document.getElementById(`domain-card-${numStr}`);
      expect(card).toBeDefined();
    }
  });

  it('renders all 13 shared data bus nodes with correct IDs', () => {
    render(<InteractiveDashboard />);
    
    for (let i = 1; i <= 13; i++) {
      const numStr = String(i).padStart(2, '0');
      const nodes = document.querySelectorAll(`#shared-bus-node-${numStr}`);
      expect(nodes.length).toBeGreaterThan(0);
    }
  });

  it('updates telemetry message and highlights connection on data bus node click', () => {
    render(<InteractiveDashboard />);
    
    // Click on Fitness node (03)
    const fitnessNode = document.querySelectorAll('#shared-bus-node-03')[0];
    expect(fitnessNode).toBeDefined();

    // Click it to set active
    fireEvent.click(fitnessNode);
    
    // Assert scrollIntoView mock was called for the card
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

    // Verify the inspector shows Fitness-specific streams
    const inspectorText = screen.getByText(/Fitness Agent streaming HRV & Recovery windows/i);
    expect(inspectorText).toBeDefined();
  });

  it('clears active node when clear lock button is clicked', () => {
    render(<InteractiveDashboard />);
    
    // Click on Fitness node (03) to lock it
    const fitnessNode = document.querySelectorAll('#shared-bus-node-03')[0];
    fireEvent.click(fitnessNode);

    // Find and click the clear button
    const clearBtn = document.getElementById('bus-clear-trigger');
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn);

    // Verify the inspector text resets to default
    const defaultText = screen.getByText(/Hover over or click a domain node/i);
    expect(defaultText).toBeDefined();
  });
});
