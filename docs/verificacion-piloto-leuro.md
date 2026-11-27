# Verificación del piloto de Leuro

Ejecuta `scripts/verificar-piloto-leuro.sql` en la base de pruebas con una cuenta Técnico asignada a Leuro. El script revierte la transacción.

```sh
psql -v tecnico=demo.operario@local.test -v equipo=LEU-FACO-001 \
  -f scripts/verificar-piloto-leuro.sql
```

## Prueba en Android

1. Inicia sesión con la cuenta de prueba y sincroniza en Leuro.
2. Escanea un Fan coil. Abre la ficha y comprueba que solo se pueda consultar.
3. Abre el checklist. Activa el modo avión, verifica que las preguntas carguen y guarda con una foto general.
4. Vuelve al listado y verifica que aumente el avance y quede pendiente la sincronización.
5. Recupera la conexión. Sincroniza y busca la respuesta en el histórico web. Comprueba que se registre una sola vez y que la foto corresponda al activo.
6. Verifica la fecha de cierre con el script y comprueba que la app retire el checklist vencido de las pendientes.

Para el piloto de campo, anota inmueble, activo, versión de la app, fecha, resultado y persona que ejecutó la prueba en el issue #11.
