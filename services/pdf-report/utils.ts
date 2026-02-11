export /**
 * Format date to Spanish format.
 * @param dateStr Date string in ISO or other format.
 * @param format 'short' for DD.MM.YYYY, 'long' for 'DD de Month del YYYY'
 */
function formatDate(
  dateStr: string,
  format: 'short' | 'long' = 'short',
): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Try appending time if it's just a date string to avoid timezone issues
    const dateWithTime = new Date(dateStr + 'T12:00:00');
    if (!isNaN(dateWithTime.getTime())) {
      return formatDateInstance(dateWithTime, format);
    }
    return dateStr; // Return as is if invalid
  }
  return formatDateInstance(date, format);
}

function formatDateInstance(date: Date, format: 'short' | 'long'): string {
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'short') {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}.${year}`;
  } else {
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const month = months[date.getMonth()];
    return `${day} de ${month} del ${year}`;
  }
}
