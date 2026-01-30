import { useMemo } from 'react';
import { MqttMessage } from '@/types/mqtt';
import { Card, CardHeader, CardBody } from '@/components/atoms/Card/Card';
import { MessageRow } from '@/components/molecules/MessageRow/MessageRow';
import styles from './RawMessageTable.module.css';

export interface RawMessageTableProps {
  messages: MqttMessage[];
  emptyMessage?: string;
}

export function RawMessageTable({ messages, emptyMessage = 'No messages' }: RawMessageTableProps) {
  // Reverse to show newest first
  const sortedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  return (
    <Card>
      <CardHeader>
        <div className={styles.header}>
          <h2>Messages ({messages.length})</h2>
        </div>
      </CardHeader>
      <CardBody>
        {sortedMessages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📡</div>
            <p className={styles.emptyText}>{emptyMessage}</p>
          </div>
        ) : (
          <div className={styles.messageList}>
            {sortedMessages.map((message, index) => (
              <MessageRow key={`${message.timestamp}-${index}`} message={message} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
