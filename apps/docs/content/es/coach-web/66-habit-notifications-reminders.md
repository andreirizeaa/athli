# Notificaciones y Recordatorios de Habitos

## ¿Que es esto?

Los clientes reciben notificaciones push para recordarles sobre sus habitos asignados. Las notificaciones ayudan a los clientes a mantenerse en el camino al pedirles que registren sus habitos en el momento adecuado. Tambien puedes configurar secuencias de recordatorios automatizados a traves de flujos de automatizacion para hacer seguimiento cuando se pierden habitos.

## ¿Por que es util?

La consistencia es la clave para la formacion de habitos, y los recordatorios oportunos mejoran significativamente el cumplimiento. Sin notificaciones, los clientes pueden olvidar registrar sus habitos, lo que lleva a vacios en el seguimiento y perdida de impulso. Las notificaciones push y los seguimientos automatizados mantienen los habitos presentes sin que tengas que verificar manualmente.

## Guia Paso a Paso

### Como Funcionan las Notificaciones Predeterminadas

1. Cuando se asigna un habito, la aplicacion movil del cliente programa notificaciones push
2. Los clientes reciben un recordatorio cuando un habito vence (diario o semanal, dependiendo del periodo de seguimiento)
3. Al tocar la notificacion se abre la aplicacion directamente en el habito para un registro rapido
4. Las notificaciones continuan durante la duracion de la asignacion del habito

> [Screenshot: Push notification on a client's phone reminding them to log a habit]

### Configurar Recordatorios Automatizados

Para mas control sobre el momento de los recordatorios y los seguimientos, usa flujos de automatizacion:

1. Ve a **Automatizaciones** desde la barra lateral
2. Crea una nueva automatizacion o edita una existente
3. Establece el activador como **Habito Perdido** o un horario basado en tiempo
4. Agrega una accion como **Enviar Notificacion** o **Enviar Mensaje**
5. Personaliza el contenido del mensaje para animar al cliente
6. Guarda y activa la automatizacion

> [Screenshot: Automation flow with a missed habit trigger and notification action]

### Seguimientos de Habitos Perdidos

Los flujos de automatizacion pueden activar acciones cuando un cliente pierde un registro de habito:

- Enviar un recordatorio suave por notificacion push
- Enviar un mensaje directo preguntando como estan
- Agregar una tarea a tu lista de pendientes para hacer seguimiento personalmente
- Activar una secuencia de recordatorios escalonados durante multiples dias

> [Screenshot: Automation sequence showing escalating reminders for missed habits]

### Asegurar que los Clientes Tengan Notificaciones Habilitadas

Para que las notificaciones push funcionen, los clientes deben tenerlas habilitadas en su dispositivo:

1. Pide a los clientes que abran los **Ajustes** de su telefono
2. Encuentren la aplicacion Athli en la lista de aplicaciones
3. Asegurense de que las **Notificaciones** esten activadas
4. Tambien asegurense de que **No Molestar** no este bloqueando las notificaciones de la aplicacion
5. Si un cliente reporta que no recibe notificaciones, esto es lo primero que se debe verificar

### Mejores Practicas para el Momento de los Recordatorios

- **Habitos matutinos** (agua, suplementos): establece recordatorios para temprano en la manana
- **Habitos de actividad** (estiramientos, caminata): establece recordatorios para la hora preferida de entrenamiento del cliente
- **Habitos nocturnos** (registro de sueno, reflexion): establece recordatorios para temprano en la noche
- Evita enviar demasiadas notificaciones. Una por habito por dia generalmente es suficiente.
- Personaliza los mensajes de recordatorio para que se sientan de apoyo, no molestos

## Cosas a Tener en Cuenta

- Las notificaciones push requieren que el cliente tenga la aplicacion Athli instalada y las notificaciones habilitadas
- Los recordatorios de automatizacion son separados de las notificaciones predeterminadas de habitos
- No puedes controlar la hora exacta de las notificaciones push predeterminadas desde el panel del entrenador
- Los clientes pueden gestionar sus preferencias de notificacion en los ajustes de la aplicacion movil

---

## Preguntas Frecuentes

### ¿Puedo personalizar el mensaje de notificacion?

Las notificaciones predeterminadas de habitos usan mensajes estandar. Para mensajes personalizados, usa flujos de automatizacion para enviar recordatorios personalizados.

### ¿Que pasa si un cliente desactiva las notificaciones?

No recibiran recordatorios push pero aun pueden registrar habitos manualmente abriendo la aplicacion. Anima a los clientes a mantener las notificaciones habilitadas.

### ¿Puedo establecer diferentes horarios de recordatorio para diferentes habitos?

Las notificaciones predeterminadas siguen un horario del sistema. Para horarios especificos, configura flujos de automatizacion separados para cada habito con activadores basados en tiempo.

### ¿Las notificaciones funcionan tanto en iOS como en Android?

Si. Las notificaciones push son compatibles con ambas plataformas siempre que esten habilitadas en los ajustes del dispositivo.
