# Sincronizar Respuestas de Check-in con Metricas

## ¿Que es esto?

Cuando agregas una pregunta de tipo Numero a un check-in, puedes vincularla a una metrica. Cuando el cliente envia su check-in, el valor numerico que ingresa se registra automaticamente en la metrica vinculada. Esto crea un flujo de datos continuo entre las respuestas de check-in y tus graficos de seguimiento de metricas.

## ¿Por que es util?

Sin la sincronizacion, los clientes necesitarian enviar un check-in y luego registrar por separado el mismo valor en una metrica. Eso significa doble entrada, lo cual es tedioso y propenso a errores. Al vincular una pregunta de check-in directamente a una metrica, los datos fluyen automaticamente. El cliente completa el check-in una vez, y el grafico de la metrica se actualiza solo.

## Guia Paso a Paso

### Configurar la Sincronizacion

1. Ve a **Biblioteca > Formularios > Check-ins**
2. Abre el check-in que quieres editar
3. Encuentra la pregunta de **Numero** que quieres vincular (o crea una nueva pregunta de Numero)
4. Haz clic en la pregunta para editarla
5. Busca la opcion **Vincular a Metrica**
6. Selecciona la metrica con la que quieres sincronizar del menu desplegable
7. Haz clic en **Guardar**

> [Screenshot 1: Number question with Link to Metric dropdown showing available metrics]

### Como Funciona la Sincronizacion

1. El cliente abre su check-in en la aplicacion movil
2. Ingresa un valor numerico para la pregunta vinculada (ej., peso corporal: 82.5)
3. Envia el check-in
4. El valor se registra automaticamente en la metrica vinculada con la fecha de envio
5. El grafico de la metrica se actualiza para incluir el nuevo punto de datos

> [Screenshot 2: Metric chart showing data points synced from check-in submissions]

### Requisitos para la Sincronizacion

- La pregunta del check-in debe ser de tipo **Numero**. Las preguntas de Texto, Calificacion, Si/No, Opcion Multiple y Escala no se pueden sincronizar con metricas.
- La metrica debe existir ya en tu biblioteca y estar asignada al cliente.
- Una pregunta puede vincularse a una metrica a la vez.

## Cosas a Tener en Cuenta

- Solo las preguntas de tipo Numero admiten sincronizacion con metricas
- Si el cliente omite la pregunta (y es opcional), no se registra ningun valor en la metrica
- Editar una respuesta de check-in no actualiza automaticamente el valor sincronizado de la metrica
- Puedes vincular multiples preguntas de Numero en el mismo check-in a diferentes metricas

---

## Preguntas Frecuentes

### ¿Puedo vincular una pregunta a multiples metricas?

No. Cada pregunta de Numero puede vincularse a una metrica a la vez.

### ¿Que sucede si desvinculo una pregunta de una metrica?

Los puntos de datos previamente sincronizados permanecen en el historial de la metrica. Solo los envios futuros dejan de sincronizarse.

### ¿Puedo editar manualmente un valor que fue sincronizado desde un check-in?

Si. Puedes editar o eliminar cualquier entrada de registro de metrica desde la pestana de Metricas del cliente, independientemente de como fue creada.

### ¿La sincronizacion funciona retroactivamente?

No. Solo los envios de check-in realizados despues de que se configura el vinculo se sincronizaran con la metrica.
