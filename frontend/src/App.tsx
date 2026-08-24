import React, { useState, useEffect } from 'react';
import { VehicleClass } from './types';
import { Header } from './components/Header';
import { Navigation, ScreenId } from './components/Navigation';

// Screens
import { CommandDashboard } from './components/screens/CommandDashboard';
import { LiveMap } from './components/screens/LiveMap';
import { AccessibilityHeatmap } from './components/screens/AccessibilityHeatmap';
import { PlanDispatch } from './components/screens/PlanDispatch';
import { DisruptionConsole } from './components/screens/DisruptionConsole';
import { WhatIfSimulator } from './components/screens/WhatIfSimulator';
import { DecisionLog } from './components/screens/DecisionLog';
import { DriverView } from './components/screens/DriverView';
import { CitizenReportForm } from './components/screens/CitizenReportForm';

// New screens
import { RouteOptimizer } from './components/screens/RouteOptimizer';
import { DeliveriesScreen } from './components/screens/DeliveriesScreen';
import { VehicleTracking } from './components/screens/VehicleTracking';

import {
  fetchMapSegments, fetchLocations, fetchVehicles, fetchEvents,
  controlSimClock, runDemoScenario, resetDemo
} from './services/api';

export function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('S1');
  const [vclass, setVclass] = useState<VehicleClass>('heavy');
  const [simHour, setSimHour] = useState<number>(0);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);

  const [segments, setSegments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Initial Data Load
  useEffect(() => {
    fetchMapSegments(vclass).then(data => setSegments(data.features || []));
    fetchLocations().then(data => setLocations(data));
    fetchVehicles().then(data => setVehicles(data));
    fetchEvents().then(data => setEvents(data));
  }, [vclass]);

  // WebSocket real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'clock_tick') {
          setSimHour(msg.sim_time);
        } else if (msg.type === 'lns_update' || msg.type === 'event_ingested') {
          fetchMapSegments(vclass).then(data => setSegments(data.features || []));
          fetchEvents().then(data => setEvents(data));
        } else if (msg.type === 'demo_reset') {
          setSimHour(0);
          fetchMapSegments(vclass).then(data => setSegments(data.features || []));
          fetchEvents().then(data => setEvents([]));
        }
      };
    } catch (e) {
      console.warn('WebSocket unavailable — polling fallback active.');
    }

    return () => { if (ws) ws.close(); };
  }, [vclass]);

  const handleToggleClock = async () => {
    const nextRunning = !isClockRunning;
    setIsClockRunning(nextRunning);
    await controlSimClock(nextRunning ? 'play' : 'pause');
  };

  const handleSetSpeed = async (speed: number) => {
    await controlSimClock('set_speed', speed);
  };

  const handleRunDemo = async () => {
    const res = await runDemoScenario();
    if (res.sim_hour) setSimHour(res.sim_hour);
    fetchEvents().then(data => setEvents(data));
    setActiveScreen('S5');
  };

  const handleReset = async () => {
    await resetDemo();
    setSimHour(0);
    setIsClockRunning(false);
    fetchEvents().then(data => setEvents([]));
    fetchMapSegments(vclass).then(data => setSegments(data.features || []));
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans">
      {/* Global Header */}
      <Header
        vclass={vclass}
        setVclass={setVclass}
        simHour={simHour}
        isClockRunning={isClockRunning}
        onToggleClock={handleToggleClock}
        onSetSpeed={handleSetSpeed}
        onReset={handleReset}
        onRunDemo={handleRunDemo}
      />

      {/* Tab Navigation */}
      <Navigation
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        pendingApprovalCount={events.filter(e => !e.resolved).length}
      />

      {/* Active Screen View Renderer */}
      <main className="flex-1 overflow-y-auto">
        {activeScreen === 'S1' && (
          <CommandDashboard
            vclass={vclass}
            simHour={simHour}
            events={events}
            onNavigate={(scr) => setActiveScreen(scr as ScreenId)}
          />
        )}
        {activeScreen === 'S2' && (
          <LiveMap
            vclass={vclass}
            setVclass={setVclass}
            segments={segments}
            locations={locations}
            vehicles={vehicles}
          />
        )}
        {activeScreen === 'S3' && (
          <AccessibilityHeatmap vclass={vclass} setVclass={setVclass} />
        )}

        {/* New screens */}
        {activeScreen === 'S_route'      && <RouteOptimizer />}
        {activeScreen === 'S_deliveries' && <DeliveriesScreen />}
        {activeScreen === 'S_vehicles'   && <VehicleTracking />}

        {activeScreen === 'S4' && <PlanDispatch />}
        {activeScreen === 'S5' && <DisruptionConsole />}
        {activeScreen === 'S6' && <WhatIfSimulator />}
        {activeScreen === 'S7' && <DecisionLog />}
        {activeScreen === 'S8' && <DriverView />}
        {activeScreen === 'S9' && <CitizenReportForm />}
      </main>
    </div>
  );
}
