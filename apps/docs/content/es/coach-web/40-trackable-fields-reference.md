# Referencia de Campos Rastreables

## ¿Que es esto?

Cada ejercicio en un entrenamiento tiene columnas configurables que determinan que datos se rastrean para cada serie. El Constructor de Entrenamientos soporta una amplia gama de campos rastreables mas alla de las Series, Repeticiones y Peso estandar. Puedes elegir que campos mostrar para cada ejercicio, adaptando el seguimiento a las demandas especificas del movimiento.

## ¿Por que es util?

Diferentes ejercicios requieren diferentes metricas. Una sentadilla con barra necesita repeticiones y peso en kilogramos. Una carrera en cinta necesita minutos y velocidad. Una plancha necesita segundos. Al configurar los campos correctos para cada ejercicio, aseguras que los clientes registren datos significativos y obtengas analiticas precisas para decisiones de programacion.

## Tabla de Referencia de Campos

| Categoria | Campo | Descripcion |
|-----------|-------|-------------|
| Repeticiones | Reps | Numero de repeticiones |
| Peso | Kg | Peso en kilogramos |
| Peso | Lbs | Peso en libras |
| Distancia | Km | Distancia en kilometros |
| Distancia | M | Distancia en metros |
| Distancia | Yards | Distancia en yardas |
| Distancia | Miles | Distancia en millas |
| Distancia | Feet | Distancia en pies |
| Duracion | Minutes | Duracion en minutos |
| Duracion | Seconds | Duracion en segundos |
| Intensidad | Tempo | Temporizacion excentrica/pausa/concentrica/pausa (por ejemplo, 3-1-2-0) |
| Intensidad | RIR | Repeticiones en Reserva (cuantas repeticiones quedan antes del fallo) |
| Intensidad | RPE | Tasa de Esfuerzo Percibido (escala 1-10) |
| Cardio | HR Zone | Zona de frecuencia cardiaca (Zona 1-5) |
| Cardio | Calories | Calorias quemadas |
| Cardio | Watts | Potencia de salida en vatios |
| Cardio | Pace | Velocidad medida en tiempo por unidad de distancia |
| Cardio | Speed | Medicion de velocidad |
| Cardio | Incline | Porcentaje de inclinacion o pendiente |
| Cardio | Height | Medicion de altura |
| Cardio | RPM | Revoluciones por minuto (por ejemplo, cadencia de ciclismo) |
| Otro | None | Desactiva la columna completamente |
| Otro | (Optional) | Hace que la columna sea opcional para la entrada del cliente |

## Guia Paso a Paso

### Cambiar Campos para un Ejercicio

1. Abre el Constructor de Entrenamientos y localiza el ejercicio que quieres configurar.
2. Haz clic en un encabezado de columna (por ejemplo, "Reps" o "Weight") para abrir el selector de campos.
3. Aparece un desplegable mostrando todas las opciones de campos disponibles.
4. Selecciona el campo deseado. La columna se actualiza inmediatamente.
5. Repite para columnas adicionales segun sea necesario.

> [Screenshot: Column header dropdown showing available trackable fields]

### Personalizar Columnas Predeterminadas

Puedes establecer tus columnas predeterminadas preferidas para que cada nuevo ejercicio comience con los campos que mas usas:

1. Navega a **Ajustes > App > Personalizaciones**.
2. Localiza la configuracion de columnas predeterminadas.
3. Selecciona los campos que quieres como predeterminados (por ejemplo, Reps, Kg, RPE).
4. Guarda tus ajustes. Todos los ejercicios recien agregados usaran estos predeterminados.

> [Screenshot: Settings page showing default column customisation]

## Cosas a Tener en Cuenta

- Puedes mostrar multiples columnas simultaneamente (por ejemplo, Reps + Kg + RPE + Tempo).
- El modificador "(Optional)" hace que un campo este disponible pero no requiere que el cliente lo complete.
- Establecer una columna en "None" la oculta completamente para ese ejercicio.
- Diferentes ejercicios en el mismo entrenamiento pueden tener diferentes configuraciones de columnas.
- Los cambios a las columnas predeterminadas en Ajustes solo afectan a los ejercicios recien agregados, no a los existentes.

## Preguntas Frecuentes

**¿Puedo tener diferentes unidades para diferentes ejercicios?**
Si. Un ejercicio puede rastrear peso en Kg mientras otro usa Lbs. Las columnas de cada ejercicio son independientes.

**¿Cual es la diferencia entre Pace y Speed?**
Pace se mide como tiempo por unidad de distancia (por ejemplo, minutos por kilometro), mientras que Speed se mide como distancia por unidad de tiempo (por ejemplo, km/h). Usa la convencion que tu cliente prefiera.

**¿Los clientes pueden cambiar la configuracion de columnas?**
Los clientes ven las columnas que tu configuras. No pueden cambiar que campos se muestran, asegurando consistencia en los datos.

**¿Como agrego la columna de RPE a todos los ejercicios a la vez?**
Establece RPE como columna predeterminada en Ajustes > App > Personalizaciones. Para ejercicios existentes, necesitas actualizar cada uno individualmente.
