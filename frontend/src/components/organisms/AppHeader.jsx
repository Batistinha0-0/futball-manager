import { Text } from "../atoms/Text.jsx";

/**
 * @param {{ title: string, subtitle?: string }} props
 */
export function AppHeader({ title, subtitle }) {
  return (
    <header className="fm-header">
      <Text as="h1" className="fm-header__title">
        {title}
      </Text>
      {subtitle ? (
        <Text as="p" className="fm-header__subtitle">
          {subtitle}
        </Text>
      ) : null}
    </header>
  );
}
