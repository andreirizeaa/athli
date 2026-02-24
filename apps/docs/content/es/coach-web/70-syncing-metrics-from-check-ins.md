# Sincronizar Metricas desde Check-ins

## ¿Que es esto?

Las preguntas de tipo Numero en formularios de check-in se pueden vincular a metricas para que cuando un cliente envie un check-in, el valor numerico que ingresa se registre automaticamente en la metrica correspondiente. Esto crea un flujo de datos directo desde las respuestas de check-in a los graficos de metricas sin ningun esfuerzo adicional del cliente.

## ¿Por que es util?

Muchos entrenadores rastrean valores como peso corporal u horas de sueno a traves de check-ins y metricas. Sin sincronizacion, el cliente necesitaria ingresar el mismo numero dos veces: una vez en el check-in y otra en la metrica. Vincular los dos elimina la doble entrada, reduce la friccion para el cliente y asegura que tus graficos de metricas siempre esten actualizados con los ultimos datos de check-in.

## Guia Paso a Paso

### Configurar la Sincronizacion en el Constructor de Check-in

1. Ve a **Biblioteca > Formularios > Check-ins**
2. Abre el check-in que quieres configurar
3. Encuentra la pregunta de **Numero** que quieres vincular a una metrica
4. Haz clic en la pregunta para abrir sus ajustes
5. Busca la opcion **Vincular a Metrica**
6. Selecciona la metrica objetivo del menu desplegable
7. Haz clic en **Guardar**

> [Screenshot 1: Check-in builder with Link to Metric option on a Number question]

### Como Fluyen los Datos

1. El check-in se asigna a un cliente con la pregunta vinculada
2. El cliente abre el check-in en su aplicacion movil
3. Ingresa un valor para la pregunta de Numero vinculada (ej., 81.2 kg)
4. Envia el check-in
5. El valor se registra automaticamente en la metrica vinculada con la fecha de envio del check-in
6. El grafico de la metrica se actualiza para incluir el nuevo punto de datos

### Ver Datos Sincronizados

1. Ve a la pestana de **Metricas** del cliente
2. Abre la metrica vinculada
3. El grafico incluye puntos de datos tanto de registros manuales como de sincronizaciones de check-in
4. La tabla de historial muestra cada entrada con su origen
5. Las entradas sincronizadas se registran con la fecha de envio del check-in

> [Screenshot 2: Metric chart with data points sourced from check-in submissions]

### Configuraciones Comunes de Sincronizacion

| Pregunta del Check-in | Metrica Vinculada | Caso de Uso |
|-----------------------|-------------------|-------------|
| "¿Cual es tu peso hoy?" | Peso Corporal | Seguimiento de pesaje semanal |
| "¿Cuantas horas dormiste?" | Horas de Sueno | Monitoreo diario de sueno |
| "¿Cual es tu medida de cintura?" | Circunferencia de Cintura | Seguimiento mensual de medidas |
| "¿Cuantos pasos diste?" | Pasos Diarios | Seguimiento diario de actividad |
| "Califica tu estres (1-10)" | Nivel de Estres | Monitoreo de bienestar |

### Requisitos

- La pregunta del check-in debe ser de tipo **Numero**
- La metrica debe existir en tu biblioteca y estar asignada al cliente
- Cada pregunta de Numero puede vincularse a una metrica
- Multiples preguntas en el mismo check-in pueden vincularse a diferentes metricas

## Cosas a Tener en Cuenta

- Solo las preguntas de tipo Numero admiten sincronizacion con metricas. Otros tipos de preguntas (Texto, Calificacion, Si/No, Opcion Multiple, Escala) no se pueden vincular.
- Si el cliente omite una pregunta vinculada opcional, no se sincroniza ningun valor a la metrica.
- Editar una respuesta de check-in despues del envio no actualiza automaticamente el valor sincronizado de la metrica. Necesitarias editar la entrada de la metrica manualmente.
- La sincronizacion es unidireccional: de check-in a metrica. Registrar un valor de metrica manualmente no afecta las respuestas de check-in.

---

## Preguntas Frecuentes

### ¿Puedo vincular la misma metrica a preguntas en diferentes check-ins?

Si. Si tienes multiples check-ins con preguntas de Numero, cada una puede vincularse a la misma metrica. Todos los valores sincronizados aparecen en un solo grafico.

### ¿Que sucede si elimino el vinculo?

Los puntos de datos previamente sincronizados permanecen en el historial de la metrica. Solo los envios futuros de check-in dejan de sincronizarse.

### ¿Puedo sincronizar preguntas de Calificacion o Escala con metricas?

No. Solo las preguntas de tipo Numero admiten sincronizacion con metricas. Para datos de calificacion, necesitarias registrarlos manualmente.

### ¿Hay alguna forma de saber que entradas de metricas vinieron de check-ins?

Si. La tabla de historial de la metrica indica el origen de cada entrada, para que puedas distinguir entre registros manuales y sincronizaciones de check-in.
