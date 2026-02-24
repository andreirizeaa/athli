# Estructura y Programacion de Programas

## ¿Que es esto?

Este articulo cubre como estan estructurados los programas de entrenamiento en Athli y como funciona la programacion cuando los asignas a clientes. Los programas usan una cuadricula de calendario semanal que mapea entrenamientos a dias especificos a lo largo de multiples semanas. Entender esta estructura te ayuda a construir programas bien organizados y establecer horarios realistas para tus clientes.

## ¿Por que es util?

- Te ayuda a planificar fases de entrenamiento y periodizacion a lo largo de las semanas
- Facilita visualizar dias de descanso, dias de entrenamiento y sobrecarga progresiva
- Te da control sobre cuando los clientes comienzan y como progresan a traves del programa
- Asegura que los clientes vean los entrenamientos entregados en el orden correcto, semana a semana

## Guia Paso a Paso

### Vision General de la Estructura del Programa

Un programa se construye sobre una cuadricula simple:

- Las **semanas** son las filas. Un programa puede tener cualquier numero de semanas, desde una sola semana hasta 20 o mas.
- Los **dias** son las columnas. Cada semana tiene siete espacios de dia (lunes a domingo).
- Los **espacios de entrenamiento** son las celdas. Cada celda puede contener un entrenamiento o dejarse vacia.

Las celdas de dia vacias son dias de descanso. No necesitas marcarlas explicitamente. Simplemente deja la celda sin un entrenamiento.

> [Screenshot 1: program builder grid showing a 4-week program with workouts on some days and empty rest day cells]

### Construir Sobrecarga Progresiva

La sobrecarga progresiva es el aumento gradual en la demanda de entrenamiento a lo largo del tiempo. El constructor de programas hace esto sencillo:

1. Construye tu primera semana con los entrenamientos deseados.
2. **Duplica la semana** haciendo clic en el icono de copiar en la fila de la semana.
3. La semana duplicada aparece debajo con entrenamientos identicos.
4. Abre los entrenamientos individuales en la nueva semana y aumenta el peso, repeticiones, series o intensidad.
5. Repite para semanas adicionales.

Este enfoque te permite crear progresion estructurada sin reconstruir entrenamientos desde cero cada semana.

> [Screenshot 2: two consecutive weeks in the program builder, with Week 2 showing slightly higher rep counts than Week 1]

### Dias de Descanso

Los dias de descanso son simplemente dias sin un entrenamiento asignado. Cuando un cliente ve su calendario de entrenamiento:

- Los dias con entrenamientos asignados muestran los detalles del entrenamiento.
- Los dias sin entrenamientos estan vacios, indicando un dia de descanso.

No hay necesidad de crear un entrenamiento de "dia de descanso" ni marcar dias como descanso explicitamente.

### Guardar Entrenamientos Individuales desde un Programa

Si creas un entrenamiento dentro del constructor de programas que quieres reutilizar en otro lugar:

1. Haz clic en la tarjeta del entrenamiento en la cuadricula del programa.
2. Selecciona **Guardar en Biblioteca**.
3. El entrenamiento se guarda en tu biblioteca de entrenamientos, independiente del programa.
4. Ahora puedes usarlo en otros programas o asignarlo directamente a clientes.

### Programar Programas para Clientes

Cuando asignas un programa a un cliente, eliges cuando comienza:

1. Ve a la pestana **Entrenamiento** del cliente.
2. Haz clic en **Asignar Programa** y selecciona el programa.
3. Elige la **fecha de inicio**. Puede ser hoy o cualquier fecha futura.
4. Selecciona el rango de semanas (programa completo o semanas especificas).
5. Haz clic en **Asignar**.

Los entrenamientos llenan el calendario del cliente comenzando desde la fecha elegida, siguiendo la estructura semanal del programa.

> [Screenshot 3: program assignment panel with a future start date selected]

### Ajustar la Estructura Despues de la Creacion

Puedes modificar la estructura del programa en cualquier momento en el constructor:

- **Agregar semanas** insertando nuevas filas.
- **Eliminar semanas** borrando filas.
- **Mover entrenamientos** arrastrandolos entre dias o semanas.
- **Duplicar semanas** para extender el programa con bloques de entrenamiento similares.

## Cosas a Tener en Cuenta

- Los programas pueden ser de cualquier numero de semanas. No hay minimo ni maximo.
- Los cambios en la plantilla del programa despues de la asignacion no afectan los entrenamientos que ya estan en los calendarios de los clientes.
- Los clientes ven los entrenamientos semana a semana. No tienen una vista de la estructura completa del programa de multiples semanas.
- Los dias de descanso no requieren accion. Una celda vacia en la cuadricula del programa significa que no hay entrenamiento ese dia.
- Puedes programar un programa para que comience en una fecha futura para que los entrenamientos aparezcan en el calendario del cliente con anticipacion.

## Preguntas Frecuentes

### ¿Puedo crear un programa de solo 1 semana?

Si. Un programa de una sola semana es valido. Esto es util para semanas de descarga o fases introductorias.

### ¿Puedo agregar una semana en medio de un programa?

Si. Usa la funcion de insertar semana para agregar una nueva semana en cualquier posicion del programa.

### ¿Los clientes ven las semanas futuras del programa?

Los clientes ven los entrenamientos en su calendario segun el rango de fechas asignado. No ven una vista separada del programa de multiples semanas.

### ¿Puedo asignar programas superpuestos al mismo cliente?

Si. Los entrenamientos de diferentes programas pueden coexistir en el mismo calendario. No entran en conflicto entre si.

### ¿Como creo una semana de descarga?

Duplica una semana de entrenamiento y reduce el volumen o la intensidad en la semana duplicada. Alternativamente, inserta una nueva semana y construye entrenamientos mas ligeros.
