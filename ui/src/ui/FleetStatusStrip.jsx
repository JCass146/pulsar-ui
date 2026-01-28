/**
 * FleetStatusStrip Component
 * Shows overall fleet health at a glance
 */

import React from 'react';
import { Card, CardTitle, CardBody } from '../components/Card.jsx';
import { Pill } from '../components/Pill.jsx';
import './FleetStatusStrip.css';

export function FleetStatusStrip({ devices = [] }) {
  const onlineCount = devices.filter(d => d?.online).length;
  const staleCount = devices.filter(d => d?.stale && d?.online).length;
  const offlineCount = devices.length - onlineCount;
  
  return (
    <Card>
      <CardTitle size="sm">Fleet Status</CardTitle>
      <CardBody>
        <div className="fleet-status-strip">
          <div className="fleet-status-strip__item">
            <div className="fleet-status-strip__label">Online</div>
            <div className="fleet-status-strip__number">{onlineCount}</div>
            <Pill variant="success" size="sm">
              {onlineCount} {onlineCount === 1 ? 'device' : 'devices'}
            </Pill>
          </div>
          
          {staleCount > 0 && (
            <div className="fleet-status-strip__item">
              <div className="fleet-status-strip__label">Stale</div>
              <div className="fleet-status-strip__number">{staleCount}</div>
              <Pill variant="warning" size="sm">
                {staleCount} {staleCount === 1 ? 'stale' : 'stale'}
              </Pill>
            </div>
          )}
          
          {offlineCount > 0 && (
            <div className="fleet-status-strip__item">
              <div className="fleet-status-strip__label">Offline</div>
              <div className="fleet-status-strip__number">{offlineCount}</div>
              <Pill variant="danger" size="sm">
                {offlineCount} {offlineCount === 1 ? 'offline' : 'offline'}
              </Pill>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default FleetStatusStrip;
