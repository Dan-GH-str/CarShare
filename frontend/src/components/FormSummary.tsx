type FormSummaryProps = {
  title?: string;
  messages: string[];
  serverMessage?: string;
};

export function FormSummary({ title = 'Проверьте данные', messages, serverMessage }: FormSummaryProps) {
  const uniqueMessages = [...new Set(messages.filter(Boolean))];

  if (!serverMessage && uniqueMessages.length === 0) {
    return null;
  }

  return (
    <div className="formSummary" role="alert">
      <strong>{serverMessage ? 'Не удалось отправить форму' : title}</strong>
      {serverMessage ? <p>{serverMessage}</p> : null}
      {uniqueMessages.length ? (
        <ul>
          {uniqueMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
