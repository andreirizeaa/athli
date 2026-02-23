# Tipos de Preguntas en Check-ins

## ¿Que es esto?

Los formularios de check-in se construyen a partir de preguntas individuales, y cada pregunta tiene un tipo que determina como responde el cliente. Athli ofrece seis tipos de preguntas: Texto, Numero, Calificacion, Si/No, Opcion Multiple y Escala. Elegir el tipo correcto para cada pregunta asegura que recopiles datos utiles y estructurados de tus clientes.

## ¿Por que es util?

Diferentes preguntas requieren diferentes formatos de respuesta. Preguntar "¿Como te sientes?" funciona mejor como campo de texto, mientras que "Califica tu nivel de energia" encaja mejor con una calificacion o escala. Usar el tipo de pregunta correcto hace que los check-ins sean mas rapidos de completar para los clientes y mas faciles de revisar y comparar a lo largo del tiempo.

## Guia Paso a Paso

### Tipos de Preguntas Disponibles

| Tipo | Entrada | Mejor Para |
|------|---------|------------|
| **Texto** | Campo de texto abierto | Retroalimentacion cualitativa, notas, descripciones detalladas |
| **Numero** | Entrada numerica | Mediciones, valores, conteos (ej., peso corporal, horas de sueno) |
| **Calificacion** | Calificacion con estrellas o numero (ej., 1-10) | Evaluaciones subjetivas como energia, animo, dolor muscular |
| **Si/No** | Interruptor o eleccion binaria | Preguntas de confirmacion simples (ej., "¿Cumpliste tu objetivo de proteina?") |
| **Opcion Multiple** | Seleccionar entre opciones predefinidas | Respuestas categorizadas (ej., "¿Como fue tu sueno? Excelente / Bueno / Regular / Malo") |
| **Escala** | Entrada con deslizador | Respuestas matizadas en un rango (ej., nivel de estres de 0 a 100) |

> [Screenshot: Check-in builder showing the question type dropdown]

### Agregar Preguntas a un Check-in

1. Ve a **Biblioteca > Formularios > Check-ins**
2. Abre un check-in existente o haz clic en **Crear Check-in**
3. Haz clic en **Agregar Pregunta**
4. Selecciona el tipo de pregunta del menu desplegable
5. Ingresa el texto de la pregunta
6. Configura los ajustes especificos del tipo (ej., opciones para Opcion Multiple, rango para Escala)
7. Activa **Requerido** si el cliente debe responder esta pregunta
8. Haz clic en **Guardar**

> [Screenshot: Adding a multiple choice question with predefined options]

### Elegir el Tipo Correcto

- Usa **Texto** cuando quieras que el cliente explique algo con sus propias palabras, como como fue su semana o cualquier preocupacion que tenga.
- Usa **Numero** cuando necesites un valor preciso que puedas rastrear a lo largo del tiempo. Las preguntas de numero tambien se pueden sincronizar con metricas para registro automatico.
- Usa **Calificacion** cuando quieras una puntuacion subjetiva rapida, como calificar la dificultad del entrenamiento o la calidad de la recuperacion.
- Usa **Si/No** para preguntas binarias directas que no necesitan elaboracion.
- Usa **Opcion Multiple** cuando quieras limitar las respuestas a un conjunto especifico de opciones que tu defines.
- Usa **Escala** cuando quieras un deslizador que le de a los clientes mas granularidad que una calificacion simple.

### Marcar Preguntas como Requeridas u Opcionales

1. Abre la pregunta en el constructor de check-in
2. Activa o desactiva el interruptor **Requerido**
3. Las preguntas requeridas deben ser respondidas antes de que el cliente pueda enviar
4. Las preguntas opcionales se pueden dejar en blanco

> [Screenshot: Required toggle on a check-in question]

## Cosas a Tener en Cuenta

- Las preguntas de tipo Numero se pueden vincular a metricas para sincronizacion automatica de datos
- Puedes mezclar diferentes tipos de preguntas dentro del mismo check-in
- Cambiar los tipos de preguntas en una plantilla existente no afecta envios anteriores
- Los clientes ven los tipos de preguntas renderizados nativamente en su aplicacion movil

---

## Preguntas Frecuentes

### ¿Puedo cambiar el tipo de pregunta despues de crearla?

Si. Edita la pregunta en el constructor de check-in y selecciona un tipo diferente. Los envios anteriores mantienen su formato original.

### ¿Hay un limite de cuantas preguntas puedo agregar?

No hay un limite estricto, pero los check-ins mas cortos tienden a obtener tasas de completado mas altas de los clientes.

### ¿Se pueden vincular las preguntas de Numero a metricas?

Si. Las preguntas de tipo Numero se pueden sincronizar con metricas para que las respuestas del cliente se registren automaticamente en la metrica vinculada.

### ¿Los clientes ven las etiquetas del tipo de pregunta?

No. Los clientes ven el campo de entrada apropiado (cuadro de texto, deslizador, interruptor, etc.) sin la etiqueta del tipo.
