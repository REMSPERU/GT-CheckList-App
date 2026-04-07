import { Redirect } from 'expo-router';

export default function AuditoriaIndexScreen() {
  return (
    <Redirect
      href={{ pathname: '/maintenance', params: { type: 'auditoria' } }}
    />
  );
}
