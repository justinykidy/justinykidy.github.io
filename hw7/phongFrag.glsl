#version 300 es
precision highp float;

struct Material {
    vec3 diffuse;
    vec3 specular;
    float shininess;
};

struct Light {
    vec3 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

in vec3 FragPos;
in vec3 Normal;
in vec4 VertexColor;

uniform vec3 u_viewPos;
uniform Material material;
uniform Light light;

out vec4 FragColor;

void main() {
    // ambient
    vec3 ambient = light.ambient * material.diffuse;

    // diffuse
    vec3 norm     = normalize(Normal);
    vec3 lightDir = normalize(light.position - FragPos);
    float diff    = max(dot(norm, lightDir), 0.0);
    vec3 diffuse  = light.diffuse * diff * material.diffuse;

    // specular
    vec3 viewDir    = normalize(u_viewPos - FragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec      = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    vec3 specular   = light.specular * spec * material.specular;

    vec3 result   = ambient + diffuse + specular;
    FragColor     = vec4(result, 1.0) * VertexColor;
}