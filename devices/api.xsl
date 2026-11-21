<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/response">
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>MIDI devices XML API</title>
        <style>
          :root { color-scheme: light dark; font: 16px/1.5 system-ui, sans-serif; }
          body { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }
          h1 { font-size: 1.6rem; } p { margin: .5rem 0 1.5rem; }
          table { border-collapse: collapse; width: 100%; margin: .4rem 0; }
          th, td { border: 1px solid #8886; padding: .4rem .6rem; vertical-align: top; text-align: left; }
          th { width: 12rem; font-weight: 600; overflow-wrap: anywhere; }
          td, a { overflow-wrap: anywhere; } ol { padding-left: 1.5rem; }
          li { margin: .5rem 0; } summary { cursor: pointer; }
          .type { font-size: .8rem; opacity: .65; font-weight: normal; margin-left: .5rem; }
          .string { white-space: pre-wrap; } code { font-size: .9rem; }
        </style>
      </head>
      <body>
        <h1><xsl:choose><xsl:when test="field[@key='name']"><xsl:value-of select="field[@key='name']"/></xsl:when><xsl:otherwise>MIDI devices XML API</xsl:otherwise></xsl:choose></h1>
        <p>Read-only API data. This stylesheet changes presentation only.</p>
        <xsl:call-template name="value"/>
      </body>
    </html>
  </xsl:template>
  <xsl:template name="value">
    <xsl:choose>
      <xsl:when test="@type='object' and field">
        <table><tbody><xsl:for-each select="field"><tr>
          <th scope="row"><xsl:value-of select="@key"/><span class="type"><xsl:value-of select="@type"/></span></th>
          <td><xsl:choose>
            <xsl:when test="(@type='object' or @type='array') and *"><details><summary><xsl:value-of select="count(*)"/> entries</summary><xsl:call-template name="value"/></details></xsl:when>
            <xsl:otherwise><xsl:call-template name="value"/></xsl:otherwise>
          </xsl:choose></td>
        </tr></xsl:for-each></tbody></table>
      </xsl:when>
      <xsl:when test="@type='array' and item"><ol><xsl:for-each select="item"><li><xsl:call-template name="value"/></li></xsl:for-each></ol></xsl:when>
      <xsl:when test="@type='object'"><code>{}</code></xsl:when>
      <xsl:when test="@type='array'"><code>[]</code></xsl:when>
      <xsl:when test="@type='null'"><code>null</code></xsl:when>
      <xsl:when test="@type='string' and (starts-with(., 'https://') or starts-with(., 'http://'))"><a href="{.}"><xsl:value-of select="."/></a></xsl:when>
      <xsl:when test="@type='string'"><span class="string"><xsl:value-of select="."/></span></xsl:when>
      <xsl:otherwise><code><xsl:value-of select="."/></code></xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>
