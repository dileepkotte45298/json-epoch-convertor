package com.kloudinsights.jsontransformer.model;

public class TransformResponse {
    
    private String transformedJson;
    private String error;
    private int fieldsTransformed;

    public TransformResponse() {}

    public TransformResponse(String transformedJson, int fieldsTransformed) {
        this.transformedJson = transformedJson;
        this.fieldsTransformed = fieldsTransformed;
    }

    public TransformResponse(String error) {
        this.error = error;
    }

    public String getTransformedJson() { return transformedJson; }
    public void setTransformedJson(String transformedJson) { this.transformedJson = transformedJson; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public int getFieldsTransformed() { return fieldsTransformed; }
    public void setFieldsTransformed(int fieldsTransformed) { this.fieldsTransformed = fieldsTransformed; }
}
