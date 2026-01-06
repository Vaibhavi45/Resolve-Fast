from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from apps.users.models import User
from utils.validators import validate_password_strength

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'confirm_password', 'first_name', 'last_name', 'phone', 'role',
                 'pincode', 'service_type', 'service_card_id')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate agent-specific fields
        if attrs.get('role') == 'AGENT':
            if not attrs.get('service_type'):
                raise serializers.ValidationError({"service_type": "Service type is required for agents"})
            # Check if service_card_id is unique (if provided)
            service_card_id = attrs.get('service_card_id')
            if service_card_id and User.objects.filter(service_card_id=service_card_id).exists():
                raise serializers.ValidationError({"service_card_id": "Service card ID already exists"})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        email = validated_data.pop('email')
        password = validated_data.pop('password')
        role = validated_data.get('role', 'CUSTOMER')
        
        # For agents, set is_verified to False initially (admin will verify)
        if role == 'AGENT':
            validated_data['is_verified'] = False
        
        # Create user with email as the username field
        user = User.objects.create_user(
            username=email,  # Django's default UserManager requires username
            email=email,
            password=password,
            **validated_data
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Since USERNAME_FIELD is 'email', we need to authenticate with email parameter
            user = authenticate(email=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('Account is disabled')
            attrs['user'] = user
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password_strength])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect')
        return value