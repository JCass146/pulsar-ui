import { useState } from 'react';
import { MqttMessage } from '@/types/mqtt';
import { Button } from '@/components/atoms/Button/Button';
import styles from './MessageRow.module.css';

export interface MessageRowProps {
  message: MqttMessage;
}

export function MessageRow({ message }: MessageRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const handleCopy = () => {
    const text = JSON.stringify(message.payload, null, 2);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={styles.messageRow}>
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <span className={styles.timestamp}>{formatTimestamp(message.timestamp)}</span>
        <span className={styles.deviceId}>{message.deviceId}</span>
        <span className={styles.messageType}>{message.messageType}</span>
        <span className={styles.topic}>{message.topic}</span>
        <button className={styles.expandButton}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.details}>
          <div className={styles.actions}>
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              Copy JSON
            </Button>
          </div>
          <pre className={styles.payload}>
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
