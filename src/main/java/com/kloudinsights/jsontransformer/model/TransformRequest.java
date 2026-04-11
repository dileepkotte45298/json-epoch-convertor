package com.kloudinsights.jsontransformer.model;

import java.util.List;

public class TransformRequest {
    
    private String jsonInput;
    private List<String> fields;
    private String timezone;
    private String dateFormat;

    public String getJsonInput() { return jsonInput; }
    public void setJsonInput(String jsonInput) { this.jsonInput = jsonInput; }

    public List<String> getFields() { return fields; }
    public void setFields(List<String> fields) { this.fields = fields; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public String getDateFormat() { return dateFormat; }
    public void setDateFormat(String dateFormat) { this.dateFormat = dateFormat; }
}
