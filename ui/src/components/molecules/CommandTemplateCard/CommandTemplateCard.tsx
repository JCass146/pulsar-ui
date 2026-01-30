import { Card, CardBody } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import styles from './CommandTemplateCard.module.css';

export interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  command: string;
  params: Record<string, unknown>;
}

export interface CommandTemplateCardProps {
  template: CommandTemplate;
  onUse: (template: CommandTemplate) => void;
}

export function CommandTemplateCard({ template, onUse }: CommandTemplateCardProps) {
  return (
    <Card className={styles.card}>
      <CardBody>
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.name}>{template.name}</h3>
            <Button size="sm" onClick={() => onUse(template)}>
              Use
            </Button>
          </div>
          <p className={styles.description}>{template.description}</p>
          <div className={styles.commandPreview}>
            <code className={styles.code}>{template.command}</code>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
