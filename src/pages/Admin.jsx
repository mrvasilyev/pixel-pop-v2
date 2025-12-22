import { Keystatic } from '@keystatic/core/ui';
import config from '../../keystatic.config';

export default function Admin() {
    return <Keystatic config={config} />;
}
